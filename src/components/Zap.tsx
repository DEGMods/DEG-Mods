import {
  getRelayListForUser,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { QRCodeSVG } from 'qrcode.react'
import React, {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useCallback,
  useMemo,
  useState
} from 'react'
import Countdown, { CountdownRenderProps } from 'react-countdown'
import { toast } from 'react-toastify'
import { ZapController } from '../controllers'
import { useAppSelector, useDidMount, useNDKContext } from '../hooks'
import '../styles/popup.css'
import { PaymentRequest, UserProfile } from '../types'
import {
  copyTextToClipboard,
  formatNumber,
  getTagValue,
  getZapAmount,
  log,
  LogType,
  timeout,
  unformatNumber
} from '../utils'
import { LoadingSpinner } from './LoadingSpinner'
import { FALLBACK_PROFILE_IMAGE } from 'constants.ts'
import { createPortal } from 'react-dom'

type PresetAmountProps = {
  label: string
  value: number
  setAmount: Dispatch<SetStateAction<number>>
}

export const PresetAmount = React.memo(
  ({ label, value, setAmount }: PresetAmountProps) => {
    return (
      <button
        className='btn btnMain pUMCB_ZapsInsideAmountOptionsBtn'
        type='button'
        onClick={() => setAmount(value)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-64 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
        >
          <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z' />
        </svg>
        {label}
      </button>
    )
  }
)

type ZapPresetsProps = {
  setAmount: Dispatch<SetStateAction<number>>
}

export const ZapPresets = React.memo(({ setAmount }: ZapPresetsProps) => {
  return (
    <>
      <PresetAmount label='1K' value={1000} setAmount={setAmount} />
      <PresetAmount label='5K' value={5000} setAmount={setAmount} />
      <PresetAmount label='10K' value={10000} setAmount={setAmount} />
      <PresetAmount label='25K' value={25000} setAmount={setAmount} />
    </>
  )
})

type ZapButtonsProps = {
  disabled: boolean
  handleGenerateQRCode: () => void
  handleSend: () => void
}

export const ZapButtons = ({
  disabled,
  handleGenerateQRCode,
  handleSend
}: ZapButtonsProps) => {
  return (
    <div className='pUMCB_ZapsInsideBtns'>
      <button
        className='btn btnMain pUMCB_ZapsInsideElementBtn'
        type='button'
        onClick={handleGenerateQRCode}
        disabled={disabled}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-32 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
        >
          <path d='M144 32C170.5 32 192 53.49 192 80V176C192 202.5 170.5 224 144 224H48C21.49 224 0 202.5 0 176V80C0 53.49 21.49 32 48 32H144zM128 96H64V160H128V96zM144 288C170.5 288 192 309.5 192 336V432C192 458.5 170.5 480 144 480H48C21.49 480 0 458.5 0 432V336C0 309.5 21.49 288 48 288H144zM128 352H64V416H128V352zM256 80C256 53.49 277.5 32 304 32H400C426.5 32 448 53.49 448 80V176C448 202.5 426.5 224 400 224H304C277.5 224 256 202.5 256 176V80zM320 160H384V96H320V160zM352 448H384V480H352V448zM448 480H416V448H448V480zM416 288H448V416H352V384H320V480H256V288H352V320H416V288z'></path>
        </svg>
      </button>
      <button
        className='btn btnMain pUMCB_ZapsInsideElementBtn'
        type='button'
        onClick={handleSend}
        disabled={disabled}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-64 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
        >
          <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z' />
        </svg>
        Send
      </button>
    </div>
  )
}

type ZapQRProps = {
  paymentRequest: PaymentRequest
  handleClose: () => void
  handleQRExpiry: () => void
  setTotalZapAmount?: Dispatch<SetStateAction<number>>
  setHasZapped?: Dispatch<SetStateAction<boolean>>
  profileImage?: string
}

export const ZapQR = React.memo(
  ({
    paymentRequest,
    handleClose,
    handleQRExpiry,
    setTotalZapAmount,
    setHasZapped,
    profileImage,
    children
  }: PropsWithChildren<ZapQRProps>) => {
    const { ndk } = useNDKContext()

    useDidMount(() => {
      ZapController.getInstance()
        .pollZapReceipt(paymentRequest, ndk)
        .then((zapReceipt) => {
          toast.success(`Successfully sent sats!`)
          if (setTotalZapAmount) {
            const amount = getZapAmount(zapReceipt)
            setTotalZapAmount((prev) => prev + amount)
            if (setHasZapped) setHasZapped(true)
          }
        })
        .catch((err) => {
          toast.error(err.message || err)
        })
        .finally(() => {
          handleClose()
        })
    })

    const onQrCodeClicked = async () => {
      if (!paymentRequest) return

      const zapController = ZapController.getInstance()

      if (await zapController.isWeblnProviderExists()) {
        zapController.sendPayment(paymentRequest.pr)
      } else {
        console.warn('Webln provider not present')

        const href = `lightning:${paymentRequest.pr}`
        const a = document.createElement('a')
        a.href = href
        a.click()
      }
    }

    return (
      <div
        className='inputLabelWrapperMain inputLabelWrapperMainQR'
        style={{ alignItems: 'center' }}
      >
        <QRCodeSVG
          className='popUpMainCardBottomQR'
          onClick={onQrCodeClicked}
          value={paymentRequest.pr}
          height={235}
          width={235}
        />
        {profileImage && (
          <div style={{ marginTop: '-20px' }}>
            <img
              src={profileImage}
              alt='Profile Avatar'
              style={{
                width: '100%',
                maxWidth: '50px',
                borderRadius: '8px',
                border: 'solid 2px #494949',
                boxShadow: '0 0 4px 0 rgb(0, 0, 0, 0.1)'
              }}
            />
          </div>
        )}
        <label
          className='popUpMainCardBottomLnurl'
          onClick={() => {
            copyTextToClipboard(paymentRequest.pr).then((isCopied) => {
              if (isCopied) toast.success('Lnurl copied to clipboard!')
            })
          }}
        >
          {paymentRequest.pr}
        </label>
        <Timer onTimerExpired={handleQRExpiry} />
        {children}
      </div>
    )
  }
)

const MAX_POLLING_TIME = 2 * 60 * 1000 // 2 minutes in milliseconds

const renderer = ({ minutes, seconds }: CountdownRenderProps) => (
  <span>
    {minutes}:{seconds}
  </span>
)

type TimerProps = {
  onTimerExpired: () => void
}

const Timer = React.memo(({ onTimerExpired }: TimerProps) => {
  const expiryTime = useMemo(() => {
    return Date.now() + MAX_POLLING_TIME
  }, [])

  return (
    <div>
      <i className='fas fa-clock'></i>
      <Countdown
        date={expiryTime}
        renderer={renderer}
        onComplete={onTimerExpired}
      />
    </div>
  )
})

type ZapPopUpProps = {
  title: string
  labelDescriptionMain?: ReactNode
  receiver: string
  eventId?: string
  aTag?: string
  notCloseAfterZap?: boolean
  lastNode?: ReactNode
  setTotalZapAmount?: Dispatch<SetStateAction<number>>
  setHasZapped?: Dispatch<SetStateAction<boolean>>

  handleClose: () => void
}

export const ZapPopUp = ({
  title,
  labelDescriptionMain,
  receiver,
  eventId,
  aTag,
  lastNode,
  notCloseAfterZap,
  setTotalZapAmount,
  setHasZapped,
  handleClose
}: ZapPopUpProps) => {
  const { ndk, findMetadata } = useNDKContext()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [message, setMessage] = useState('')
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest>()
  const [receiverMetadata, setRecieverMetadata] = useState<UserProfile>()
  const userState = useAppSelector((state) => state.user)

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const unformattedValue = unformatNumber(event.target.value)
    setAmount(unformattedValue)
  }

  const generatePaymentRequest =
    useCallback(async (): Promise<PaymentRequest | null> => {
      let userHexKey: string | undefined

      setIsLoading(true)
      setLoadingSpinnerDesc('Getting user pubkey')

      if (userState.auth && userState.user?.pubkey) {
        userHexKey = userState.user.pubkey as string
      } else {
        try {
          userHexKey = (await window.nostr?.getPublicKey()) as string
        } catch (error) {
          log(true, LogType.Error, `Could not get pubkey`, error)
        }
      }

      if (!userHexKey) {
        setIsLoading(false)
        toast.error('Could not get pubkey')
        return null
      }

      setLoadingSpinnerDesc('Finding receiver metadata')

      const receiverMetadata = await findMetadata(receiver, {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY
      })

      if (!receiverMetadata?.lud16) {
        setIsLoading(false)
        toast.error('Lighting address (lud16) is missing in receiver metadata!')
        return null
      }

      if (!receiverMetadata?.pubkey) {
        setIsLoading(false)
        toast.error('Pubkey is missing in receiver metadata!')
        return null
      }

      setRecieverMetadata(receiverMetadata)

      // Find the receiver's read relays.
      const receiverRelays = await Promise.race([
        getRelayListForUser(receiver, ndk),
        timeout(2000)
      ])
        .then((ndkRelayList) => {
          if (ndkRelayList) return ndkRelayList.readRelayUrls
          return [] // Return an empty array if ndkRelayList is undefined
        })
        .catch((err) => {
          console.error(
            `An error occurred in getting zap receiver's read relays`,
            err
          )
          return [] as string[]
        })

      const zapController = ZapController.getInstance()

      setLoadingSpinnerDesc('Creating zap request')
      return await zapController
        .getLightningPaymentRequest(
          receiverMetadata.lud16,
          amount,
          receiverMetadata.pubkey as string,
          receiverRelays,
          userHexKey,
          message,
          eventId,
          aTag
        )
        .catch((err) => {
          toast.error(err.message || err)
          return null
        })
        .finally(() => {
          setIsLoading(false)
        })
    }, [amount, message, userState, receiver, eventId, aTag, ndk, findMetadata])

  const handleGenerateQRCode = async () => {
    const pr = await generatePaymentRequest()

    if (!pr) return

    setPaymentRequest(pr)
  }

  const handleSend = useCallback(async () => {
    const pr = await generatePaymentRequest()

    if (!pr) return

    setIsLoading(true)
    setLoadingSpinnerDesc('Sending payment!')

    const zapController = ZapController.getInstance()

    if (await zapController.isWeblnProviderExists()) {
      await zapController
        .sendPayment(pr.pr)
        .then(() => {
          toast.success(`Successfully sent ${amount} sats!`)
          if (setTotalZapAmount) {
            setTotalZapAmount((prev) => prev + amount)

            if (setHasZapped) setHasZapped(true)
          }

          if (!notCloseAfterZap) {
            handleClose()
          }
        })
        .catch((err) => {
          toast.error(err.message || err)
        })
    } else {
      toast.warn('Webln is not present. Use QR code to send zap.')
      setPaymentRequest(pr)
    }

    setIsLoading(false)
  }, [
    amount,
    notCloseAfterZap,
    handleClose,
    generatePaymentRequest,
    setTotalZapAmount,
    setHasZapped
  ])

  const handleQRExpiry = useCallback(() => {
    setPaymentRequest(undefined)
  }, [])

  const handleQRClose = useCallback(() => {
    setPaymentRequest(undefined)
    setIsLoading(false)
    if (!notCloseAfterZap) {
      handleClose()
    }
  }, [notCloseAfterZap, handleClose])

  return createPortal(
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
      <div className='popUpMain'>
        <div className='ContainerMain'>
          <div className='popUpMainCardWrapper'>
            <div className='popUpMainCard popUpMainCardQR'>
              <div className='popUpMainCardTop'>
                <div className='popUpMainCardTopInfo'>
                  <h3>{title}</h3>
                </div>
                <div className='popUpMainCardTopClose' onClick={handleClose}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='-96 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                    style={{ zIndex: 1 }}
                  >
                    <path d='M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z' />
                  </svg>
                </div>
              </div>
              <div className='pUMCB_Zaps'>
                <div className='pUMCB_ZapsInside'>
                  <div className='pUMCB_ZapsInsideAmount'>
                    <div className='inputLabelWrapperMain'>
                      {labelDescriptionMain}
                      <label className='form-label labelMain'>
                        Amount (Satoshis)
                      </label>
                      <input
                        className='inputMain'
                        type='text'
                        inputMode='numeric'
                        value={amount ? formatNumber(amount) : ''}
                        onChange={handleAmountChange}
                      />
                    </div>
                    <div className='pUMCB_ZapsInsideAmountOptions'>
                      <ZapPresets setAmount={setAmount} />
                    </div>
                  </div>
                  <div className='inputLabelWrapperMain'>
                    <label className='form-label labelMain'>
                      Message (optional)
                    </label>
                    <input
                      type='text'
                      className='inputMain'
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <ZapButtons
                    disabled={!amount}
                    handleGenerateQRCode={handleGenerateQRCode}
                    handleSend={handleSend}
                  />
                  {paymentRequest && (
                    <ZapQR
                      paymentRequest={paymentRequest}
                      handleClose={handleQRClose}
                      handleQRExpiry={handleQRExpiry}
                      setTotalZapAmount={setTotalZapAmount}
                      setHasZapped={setHasZapped}
                      profileImage={receiverMetadata?.image}
                    />
                  )}
                  {lastNode}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

type ZapSplitProps = {
  pubkey: string
  eventId?: string
  aTag?: string
  setTotalZapAmount?: Dispatch<SetStateAction<number>>
  setHasZapped?: Dispatch<SetStateAction<boolean>>
  handleClose: () => void
}

export const ZapSplit = ({
  pubkey,
  eventId,
  aTag,
  setTotalZapAmount,
  setHasZapped,
  handleClose
}: ZapSplitProps) => {
  const { ndk, findMetadata } = useNDKContext()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [message, setMessage] = useState('')
  const [authorPercentage, setAuthorPercentage] = useState(90)
  const [adminPercentage, setAdminPercentage] = useState(10)

  const [author, setAuthor] = useState<UserProfile>()
  const [admin, setAdmin] = useState<UserProfile>()

  const userState = useAppSelector((state) => state.user)

  const [invoices, setInvoices] = useState<Map<string, PaymentRequest>>()

  useDidMount(async () => {
    findMetadata(pubkey, {
      cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY
    }).then((res) => {
      setAuthor(res)
    })

    const adminNpubs = import.meta.env.VITE_ADMIN_NPUBS.split(',')
    findMetadata(adminNpubs[0], {
      cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY
    }).then((res) => {
      setAdmin(res)
    })
  })

  const handleAuthorPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseInt(e.target.value)
    setAuthorPercentage(newValue)
    setAdminPercentage(100 - newValue)
  }

  const handleAdminPercentageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = parseInt(e.target.value)
    setAdminPercentage(newValue)
    setAuthorPercentage(100 - newValue) // Update the other slider to maintain 100%
  }

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const unformattedValue = unformatNumber(event.target.value)
    setAmount(unformattedValue)
  }

  const generatePaymentInvoices = async () => {
    if (!amount) return null

    let userHexKey: string | undefined

    setIsLoading(true)
    setLoadingSpinnerDesc('Getting user pubkey')

    if (userState.auth && userState.user?.pubkey) {
      userHexKey = userState.user.pubkey as string
    } else {
      try {
        userHexKey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!userHexKey) {
      setIsLoading(false)
      toast.error('Could not get pubkey')
      return null
    }

    const adminShare = Math.floor((amount * adminPercentage) / 100)
    const authorShare = amount - adminShare

    const zapController = ZapController.getInstance()

    const invoices = new Map<string, PaymentRequest>()

    if (authorShare > 0 && author?.pubkey && author?.lud16) {
      // Find the receiver's read relays.
      const authorRelays = await getRelayListForUser(
        author.pubkey as string,
        ndk
      )
        .then((ndkRelayList) => {
          if (ndkRelayList) return ndkRelayList.readRelayUrls
          return [] // Return an empty array if ndkRelayList is undefined
        })
        .catch((err) => {
          console.error(
            `An error occurred in getting zap receiver's read relays`,
            err
          )
          return [] as string[]
        })

      setLoadingSpinnerDesc('Generating invoice for author')
      const invoice = await zapController
        .getLightningPaymentRequest(
          author.lud16,
          authorShare,
          author.pubkey as string,
          authorRelays,
          userHexKey,
          message,
          eventId,
          aTag
        )
        .catch((err) => {
          toast.error(err.message || err)
          return null
        })

      if (invoice) {
        invoices.set('author', invoice)
      }
    }

    if (adminShare > 0 && admin?.pubkey && admin?.lud16) {
      // Find the receiver's read relays.
      // TODO: NDK should have native timeout in a future release
      const adminRelays = await Promise.race([
        getRelayListForUser(admin.pubkey as string, ndk),
        timeout(2000)
      ])
        .then((ndkRelayList) => {
          if (ndkRelayList) return ndkRelayList.readRelayUrls
          return [] // Return an empty array if ndkRelayList is undefined
        })
        .catch((err) => {
          console.error(
            `An error occurred in getting zap receiver's read relays`,
            err
          )
          return [] as string[]
        })

      setLoadingSpinnerDesc('Generating invoice for site owner')
      const invoice = await zapController
        .getLightningPaymentRequest(
          admin.lud16,
          adminShare,
          admin.pubkey as string,
          adminRelays,
          userHexKey,
          message,
          eventId,
          aTag
        )
        .catch((err) => {
          toast.error(err.message || err)
          return null
        })

      if (invoice) {
        invoices.set('admin', invoice)
      }
    }

    setIsLoading(false)

    return invoices
  }

  const handleGenerateQRCode = async () => {
    const paymentInvoices = await generatePaymentInvoices()

    if (!paymentInvoices) return

    setInvoices(paymentInvoices)
  }

  const handleSend = async () => {
    const paymentInvoices = await generatePaymentInvoices()

    if (!paymentInvoices) return

    setIsLoading(true)
    setLoadingSpinnerDesc('Sending payment!')

    const zapController = ZapController.getInstance()

    if (await zapController.isWeblnProviderExists()) {
      const authorInvoice = paymentInvoices.get('author')
      if (authorInvoice) {
        setLoadingSpinnerDesc('Sending payment to author')

        const sats = parseInt(getTagValue(authorInvoice, 'amount')![0]) / 1000

        await zapController
          .sendPayment(authorInvoice.pr)
          .then(() => {
            toast.success(`Successfully sent ${sats} sats to author!`)
            if (setTotalZapAmount) {
              setTotalZapAmount((prev) => prev + sats)

              if (setHasZapped) setHasZapped(true)
            }
          })
          .catch((err) => {
            toast.error(err.message || err)
          })
      }

      const adminInvoice = paymentInvoices.get('admin')
      if (adminInvoice) {
        setLoadingSpinnerDesc('Sending payment to site owner')

        const sats = parseInt(getTagValue(adminInvoice, 'amount')![0]) / 1000

        await zapController
          .sendPayment(adminInvoice.pr)
          .then(() => {
            toast.success(`Successfully sent ${sats} sats to site owner!`)
          })
          .catch((err) => {
            toast.error(err.message || err)
          })
      }

      handleClose()
    } else {
      toast.warn('Webln is not present. Use QR code to send zap.')
      setInvoices(paymentInvoices)
    }

    setIsLoading(false)
  }

  const removeInvoice = (key: string) => {
    setInvoices((prev) => {
      const newMap = new Map(prev)
      newMap.delete(key)
      return newMap
    })
  }

  const displayQR = () => {
    if (!invoices) return null

    const authorInvoice = invoices.get('author')
    const feedback = (isFirst: boolean) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          flexWrap: 'wrap',
          gridGap: '10px'
        }}
      >
        <div
          className='btn btnMain'
          style={{
            flexGrow: 1,
            cursor: 'default',
            background: isFirst ? undefined : 'unset'
          }}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='-64 0 512 512'
            width='1em'
            height='1em'
            fill='currentColor'
          >
            <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z'></path>
          </svg>
          1st Invoice
        </div>
        <div
          className='btn btnMain'
          style={{
            flexGrow: 1,
            cursor: 'default',
            background: isFirst ? 'unset' : undefined
          }}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='-64 0 512 512'
            width='1em'
            height='1em'
            fill='currentColor'
          >
            <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z'></path>
          </svg>
          2nd Invoice
        </div>
      </div>
    )
    if (authorInvoice) {
      return (
        <ZapQR
          key={authorInvoice.pr}
          paymentRequest={authorInvoice}
          handleClose={() => removeInvoice('author')}
          handleQRExpiry={() => removeInvoice('author')}
          setTotalZapAmount={setTotalZapAmount}
          setHasZapped={setHasZapped}
          profileImage={author?.image}
        >
          {feedback(true)}
        </ZapQR>
      )
    }

    const adminInvoice = invoices.get('admin')
    if (adminInvoice) {
      return (
        <ZapQR
          key={adminInvoice.pr}
          paymentRequest={adminInvoice}
          handleClose={() => {
            removeInvoice('admin')
            handleClose()
          }}
          handleQRExpiry={() => removeInvoice('admin')}
          profileImage={admin?.image}
        >
          {feedback(false)}
        </ZapQR>
      )
    }

    return null
  }

  const authorName = author?.displayName || author?.name || '[name not set up]'
  const adminName = admin?.displayName || admin?.name || '[name not set up]'

  return (
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
      <div className='popUpMain'>
        <div className='ContainerMain'>
          <div className='popUpMainCardWrapper'>
            <div className='popUpMainCard popUpMainCardQR'>
              <div className='popUpMainCardTop'>
                <div className='popUpMainCardTopInfo'>
                  <h3>Tip/Zap</h3>
                </div>
                <div className='popUpMainCardTopClose' onClick={handleClose}>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='-96 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                    style={{ zIndex: 1 }}
                  >
                    <path d='M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z' />
                  </svg>
                </div>
              </div>
              <div className='pUMCB_Zaps'>
                <div className='pUMCB_ZapsInside'>
                  <div className='pUMCB_ZapsInsideAmount'>
                    <div className='inputLabelWrapperMain'>
                      <label className='form-label labelMain'>
                        Amount (Satoshis)
                      </label>
                      <input
                        className='inputMain'
                        type='text'
                        inputMode='numeric'
                        value={amount ? formatNumber(amount) : ''}
                        onChange={handleAmountChange}
                      />
                    </div>
                    <div className='pUMCB_ZapsInsideAmountOptions'>
                      <ZapPresets setAmount={setAmount} />
                    </div>
                  </div>
                  <div className='inputLabelWrapperMain'>
                    <label className='form-label labelMain'>
                      Message (optional)
                    </label>
                    <input
                      type='text'
                      className='inputMain'
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <div className='inputLabelWrapperMain'>
                    <label className='form-label labelMain'>Tip Split</label>
                    <div className='ZapSplitUserBox'>
                      <div className='ZapSplitUserBoxUser'>
                        <div
                          className='ZapSplitUserBoxUserPic'
                          style={{
                            background: `url('${
                              author?.image || FALLBACK_PROFILE_IMAGE
                            }') center / cover no-repeat`
                          }}
                        ></div>
                        <div className='ZapSplitUserBoxUserDetails'>
                          <p className='ZapSplitUserBoxUserDetailsName'>
                            {authorName}
                          </p>
                          {author?.nip05 && (
                            <p className='ZapSplitUserBoxUserDetailsHandle'>
                              {author.nip05}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className='ZapSplitUserBoxRange'>
                        <input
                          className='form-range inputRangeMain inputRangeMainZap'
                          type='range'
                          max='100'
                          min='0'
                          value={authorPercentage}
                          onChange={handleAuthorPercentageChange}
                          step='1'
                          required
                          name='ZapSplitName'
                        />
                        <p className='ZapSplitUserBoxRangeText'>
                          {authorPercentage}%
                        </p>
                      </div>
                      <p className='ZapSplitUserBoxText'>
                        This goes to show your appreciation to the mod creator!
                      </p>
                    </div>
                    <div className='ZapSplitUserBox'>
                      <div className='ZapSplitUserBoxUser'>
                        <div
                          className='ZapSplitUserBoxUserPic'
                          style={{
                            background: `url('${
                              admin?.image || FALLBACK_PROFILE_IMAGE
                            }') center / cover no-repeat`
                          }}
                        ></div>
                        <div className='ZapSplitUserBoxUserDetails'>
                          <p className='ZapSplitUserBoxUserDetailsName'>
                            {adminName}
                          </p>
                          {admin?.nip05 && (
                            <p className='ZapSplitUserBoxUserDetailsHandle'></p>
                          )}
                        </div>
                      </div>
                      <div className='ZapSplitUserBoxRange'>
                        <input
                          className='form-range inputRangeMain inputRangeMainZap'
                          type='range'
                          max='100'
                          min='0'
                          value={adminPercentage}
                          onChange={handleAdminPercentageChange}
                          step='1'
                          required
                          name='ZapSplitName'
                        />
                        <p className='ZapSplitUserBoxRangeText'>
                          {adminPercentage}%
                        </p>
                      </div>
                      <p className='ZapSplitUserBoxText'>
                        Help with the development, maintenance, management, and
                        growth of DEG Mods.
                      </p>
                    </div>
                  </div>
                  <ZapButtons
                    disabled={!amount}
                    handleGenerateQRCode={handleGenerateQRCode}
                    handleSend={handleSend}
                  />
                  {displayQR()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
