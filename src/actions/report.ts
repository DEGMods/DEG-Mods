import { NDKFilter } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { kinds, nip19, UnsignedEvent } from 'nostr-tools'
import { ActionFunctionArgs } from 'react-router-dom'
import { toast } from 'react-toastify'
import { store } from 'store'
import { UserRelaysType } from 'types'
import {
  log,
  LogType,
  now,
  npubToHex,
  parseFormData,
  sendDMUsingRandomKey,
  signAndPublish
} from 'utils'

export const reportRouteAction =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: ActionFunctionArgs) => {
    // Check which post type is reported
    const url = new URL(request.url)
    const isModReport = url.pathname.startsWith('/mod/')
    const isBlogReport = url.pathname.startsWith('/blog/')
    const title = isModReport ? 'Mod' : isBlogReport ? 'Blog' : 'Post'
    const requestData = await request.formData()
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return false
    }

    // Decode author from naddr
    let aTag: string | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      const { identifier, kind, pubkey } = decoded.data

      aTag = `${kind}:${pubkey}:${identifier}`

      if (isModReport) {
        aTag = identifier
      }
    } catch (error) {
      log(true, LogType.Error, 'Failed to decode naddr')
      return false
    }

    if (!aTag) {
      log(true, LogType.Error, 'Missing #a Tag')
      return false
    }

    const userState = store.getState().user
    let hexPubkey: string | undefined
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
    }

    const reportingNpub = import.meta.env.VITE_REPORTING_NPUB
    const reportingPubkey = npubToHex(reportingNpub)

    // Parse the the data
    const formSubmit = parseFormData(requestData)

    const selectedOptionsCount = Object.values(formSubmit).filter(
      (checked) => checked === 'on'
    ).length
    if (selectedOptionsCount === 0) {
      toast.error('At least one option should be checked!')
      return false
    }

    if (reportingPubkey === hexPubkey) {
      // Define the event filter to search for the user's mute list events.
      // We look for events of a specific kind (Mutelist) authored by the given hexPubkey.
      const filter: NDKFilter = {
        kinds: [kinds.Mutelist],
        authors: [hexPubkey]
      }

      // Fetch the mute list event from the relays. This returns the event containing the user's mute list.
      const muteListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      let unsignedEvent: UnsignedEvent
      if (muteListEvent) {
        const tags = muteListEvent.tags
        const alreadyExists =
          tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1
        if (alreadyExists) {
          toast.warn(`${title} reference is already in user's mute list`)
          return false
        }
        tags.push(['a', aTag])
        unsignedEvent = {
          pubkey: muteListEvent.pubkey,
          kind: kinds.Mutelist,
          content: muteListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: kinds.Mutelist,
          content: '',
          created_at: now(),
          tags: [['a', aTag]]
        }
      }

      try {
        hexPubkey = await window.nostr?.getPublicKey()
      } catch (error) {
        log(
          true,
          LogType.Error,
          `Could not get pubkey for reporting ${title.toLowerCase()}!`,
          error
        )
        toast.error(
          `Could not get pubkey for reporting ${title.toLowerCase()}!`
        )
        return false
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )
      return { isSent: isUpdated }
    } else if (reportingPubkey) {
      const href = window.location.href
      let message = `I'd like to report ${href} due to following reasons:\n`
      Object.entries(formSubmit).forEach(([key, value]) => {
        if (value === 'on') {
          message += `* ${key}\n`
        }
      })
      try {
        const isSent = await sendDMUsingRandomKey(
          message,
          reportingPubkey,
          ndkContext.ndk,
          ndkContext.publish
        )
        return { isSent: isSent }
      } catch (error) {
        log(
          true,
          LogType.Error,
          `Failed to send a ${title.toLowerCase()} report`,
          error
        )
        return false
      }
    } else {
      log(
        true,
        LogType.Error,
        `Failed to send a ${title.toLowerCase()} report: VITE_REPORTING_NPUB missing`
      )
      return false
    }
  }
