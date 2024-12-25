import { Invoice } from '@getalby/lightning-tools'
import NDK, {
  NDKFilter,
  NDKKind,
  NDKRelaySet,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import axios, { AxiosInstance } from 'axios'
import { kinds } from 'nostr-tools'
import { requestProvider, SendPaymentResponse, WebLNProvider } from 'webln'
import {
  isLnurlResponse,
  LnurlResponse,
  PaymentRequest,
  SignedEvent,
  ZapReceipt,
  ZapRequest
} from '../types'
import { log, LogType, npubToHex } from '../utils'

/**
 * Singleton class to manage zap related operations.
 */
export class ZapController {
  private static instance: ZapController
  private webln: WebLNProvider | null = null
  private httpClient: AxiosInstance
  private appRelay = import.meta.env.VITE_APP_RELAY

  private constructor() {
    this.httpClient = axios.create()
  }

  /**
   * @returns The singleton instance of ZapController.
   */
  public static getInstance(): ZapController {
    if (!ZapController.instance) {
      ZapController.instance = new ZapController()
    }
    return ZapController.instance
  }

  /**
   * Generates ZapRequest and payment request string. More info can be found at
   * https://github.com/nostr-protocol/nips/blob/master/57.md.
   * @param lud16 - LUD-16 of the recipient.
   * @param amount - payment amount (will be multiplied by 1000 to represent sats).
   * @param recipientPubKey - pubKey of the recipient.
   * @param recipientRelays - relays on which zap receipt will be published.
   * @param senderPubkey - pubKey of of the sender.
   * @param content - optional content (comment).
   * @param eventId - event id, if zapping an event.
   * @param aTag - value of `a` tag.
   * @returns - promise that resolves into object containing zap request and payment
   * request string
   */
  async getLightningPaymentRequest(
    lud16: string,
    amount: number,
    recipientPubKey: string,
    recipientRelays: string[],
    senderPubkey: string,
    content?: string,
    eventId?: string,
    aTag?: string
  ) {
    // Check if amount is greater than 0
    if (amount <= 0) throw 'Amount should be > 0.'

    // convert to mili satoshis
    amount *= 1000

    // decode lud16 into lnurl
    const lnurl = this.decodeLud16(lud16)

    // get receiver lightning details from lnurl pay endpoint
    const lnurlResponse = await this.getLnurlResponse(lnurl)

    const { minSendable, maxSendable, callback } = lnurlResponse

    // check if the amount is within minSendable and maxSendable values
    if (amount < minSendable || amount > maxSendable) {
      throw `Amount '${amount}' is not within minSendable and maxSendable values '${minSendable}-${maxSendable}'.`
    }

    // generate zap request
    const zapRequest = await this.createZapRequest(
      amount,
      content,
      recipientPubKey,
      recipientRelays,
      senderPubkey,
      eventId,
      aTag
    )

    if (!window.nostr?.signEvent) {
      log(
        true,
        LogType.Error,
        'Failed to sign the zap request!',
        'window.nostr.signEvent is not defined'
      )
      throw 'Failed to sign zap Request!'
    }

    // Sign zap request. This is validated by the lightning provider prior to sending the invoice(NIP-57).
    const signedEvent = await window.nostr
      .signEvent(zapRequest)
      .then((event) => event as SignedEvent)
      .catch((err) => {
        log(true, LogType.Error, 'Failed to sign the zap request!', err)
        throw 'Failed to sign the zap request!'
      })

    // Kind 9734 event must be signed and sent
    // in order to receive the invoice from the provider.
    // Encode stringified signed zap request.
    const encodedEvent = encodeURI(JSON.stringify(signedEvent))

    // send zap request as GET request to callback url received from the lnurl pay endpoint
    const { data } = await this.httpClient.get(
      `${callback}?amount=${amount}&nostr=${encodedEvent}`
    )

    // data object of the response should contain payment request
    if (data && data.pr) {
      return Promise.resolve({ ...signedEvent, pr: data.pr })
    }

    throw 'lnurl callback did not return payment request.'
  }

  /**
   * Polls zap receipt.
   * @param paymentRequest - payment request object containing zap request and
   * payment request string.
   * @param pollingTimeout - polling timeout (secs), by default equals to 6min.
   * @returns - promise that resolves into zap receipt.
   */
  async pollZapReceipt(
    paymentRequest: PaymentRequest,
    ndk: NDK,
    pollingTimeout?: number
  ) {
    const { pr, ...zapRequest } = paymentRequest
    const { created_at } = zapRequest

    // stringify zap request
    const zapRequestStringified = JSON.stringify(zapRequest)

    // eslint-disable-next-line no-async-promise-executor
    return new Promise<ZapReceipt>(async (resolve, reject) => {
      // clear polling timeout
      const cleanup = () => {
        clearTimeout(timeout)

        subscription.stop()
      }

      // Polling timeout
      const timeout = setTimeout(
        () => {
          cleanup()

          reject('Zap receipt was not received.')
        },
        pollingTimeout || 6 * 60 * 1000 // 6 minutes
      )

      const relaysTag = zapRequest.tags.find((t) => t[0] === 'relays')
      if (!relaysTag)
        throw new Error('Zap request does not contain relays tag.')

      const relayUrls = relaysTag.slice(1)

      // filter relay for event of kind 9735
      const filter: NDKFilter = {
        kinds: [NDKKind.Zap],
        since: created_at
      }

      const subscription = ndk.subscribe(
        filter,
        {
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY
        },
        NDKRelaySet.fromRelayUrls(relayUrls, ndk, true)
      )

      subscription.on('event', async (ndkEvent) => {
        // compare description tag of the event with stringified zap request
        if (ndkEvent.tagValue('description') === zapRequestStringified) {
          // validate zap receipt
          if (
            await this.validateZapReceipt(pr, ndkEvent.rawEvent() as ZapReceipt)
          ) {
            cleanup()

            resolve(ndkEvent.rawEvent() as ZapReceipt)
          }
        }
      })

      subscription.start()
    })
  }

  async isWeblnProviderExists(): Promise<boolean> {
    await this.requestWeblnProvider()
    return !!this.webln
  }

  async sendPayment(invoice: string): Promise<SendPaymentResponse> {
    if (this.webln) {
      return await this.webln!.sendPayment(invoice).catch((err) => {
        throw new Error(`Error while sending payment. Error: ${err.message}`)
      })
    }

    throw 'Webln is not defined!'
  }

  /**
   * Decodes LUD-16 into lnurl.
   * @param lud16 - LUD-16 that looks like <username>@<domainname>.
   * @returns - lnurl that looks like 'http://<domain>/.well-known/lnurlp/<username>'.
   */
  private decodeLud16(lud16: string) {
    const username = lud16.split('@')[0]
    const domain = lud16.split('@')[1]

    if (!domain || !username) throw `Provided lud16 '${lud16}' is not valid.`

    return `https://${domain}/.well-known/lnurlp/${username}`
  }

  /**
   * Fetches and validates response from lnurl pay endpoint.
   *
   * @param lnurl - lnurl pay endpoint.
   * @returns response object that conforms to LnurlResponse interface.
   */
  private async getLnurlResponse(lnurl: string): Promise<LnurlResponse> {
    // get request from lnurl pay endpoint
    const { data: lnurlResponse } = await this.httpClient.get(lnurl)

    // validate lnurl response
    this.validateLnurlResponse(lnurlResponse)

    // return callback URL
    return Promise.resolve(lnurlResponse)
  }

  /**
   * Checks if response conforms to LnurlResponse interface and if 'allowsNostr'
   * and 'nostrPubkey' supported.
   *
   * @param response - response received from lnurl pay endpoint.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private validateLnurlResponse(response: any) {
    if (!isLnurlResponse(response)) {
      throw 'Provided response is not LnurlResponse.'
    }

    if (!response.allowsNostr) throw `'allowsNostr' is not supported.`
    if (!response.nostrPubkey) throw `'nostrPubkey' is not supported.`
  }

  /**
   * Constructs zap request object.
   * @param amount - request amount (sats).
   * @param content - comment.
   * @param recipientPubKey - pubKey of the recipient.
   * @param recipientRelays - relays on which zap receipt will be published.
   * @param senderPubkey - pubKey of of the sender.
   * @param eventId - event id, if zapping an event.
   * @param aTag - value of `a` tag.
   * @returns zap request
   */
  private async createZapRequest(
    amount: number,
    content = '',
    recipientPubKey: string,
    recipientRelays: string[],
    senderPubkey: string,
    eventId?: string,
    aTag?: string
  ): Promise<ZapRequest> {
    const recipientHexKey = npubToHex(recipientPubKey)

    if (!recipientHexKey) throw 'Invalid recipient pubKey.'

    if (!recipientRelays.includes(this.appRelay)) {
      recipientRelays.push(this.appRelay)
    }

    const zapRequest: ZapRequest = {
      kind: kinds.ZapRequest,
      content,
      tags: [
        ['relays', ...recipientRelays],
        ['amount', `${amount}`],
        ['p', recipientHexKey]
      ],
      pubkey: senderPubkey,
      created_at: Math.round(Date.now() / 1000)
    }

    // add event id to the tags, if zapping an event.
    if (eventId) zapRequest.tags.push(['e', eventId])

    if (aTag) zapRequest.tags.push(['a', aTag])

    return zapRequest
  }

  /**
   * Validates zap receipt preimage and payment request string
   * @param paymentRequest - payment request string
   * @param event - zap receipt.
   * @returns - boolean indicating if preimage in zap receipt is valid
   */
  private async validateZapReceipt(paymentRequest: string, event: ZapReceipt) {
    const invoice = new Invoice({ pr: paymentRequest })

    return invoice.validatePreimage(this.getPreimageFromZapReceipt(event))
  }

  /**
   * Gets preimage from zap receipt.
   * @param event - zap receipt (9735 kind).
   * @returns - preimage string.
   */
  private getPreimageFromZapReceipt(event: ZapReceipt) {
    // filter tags by 1st item
    const preimageTag = event.tags.filter((tag) => tag[0] === 'preimage')[0]

    // throw an error if 'preimage' tag is not present
    if (!preimageTag || preimageTag.length != 2) {
      throw `'preimage' tag is not present.`
    }

    const preimage = preimageTag[1]

    // throw an error if 'preimage' value is not present
    if (!preimage) throw `'preimage' tag is not valid.`

    return preimage
  }

  private async requestWeblnProvider() {
    if (!this.webln)
      this.webln = await requestProvider().catch((err) => {
        console.log('err in requesting WebLNProvider :>> ', err.message)
        return null
      })
  }
}
