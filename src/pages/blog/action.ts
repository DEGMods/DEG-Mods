import { NDKFilter } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { kinds, nip19, UnsignedEvent } from 'nostr-tools'
import { ActionFunctionArgs } from 'react-router-dom'
import { toast } from 'react-toastify'
import { store } from 'store'
import { UserRelaysType } from 'types'
import { log, LogType, now, signAndPublish } from 'utils'

export const blogRouteAction =
  (ndkContext: NDKContextType) =>
  async ({ params, request }: ActionFunctionArgs) => {
    const { naddr } = params
    if (!naddr) {
      log(true, LogType.Error, 'Required naddr.')
      return null
    }

    // Decode author from naddr
    let aTag: string | undefined
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      const { identifier, kind, pubkey } = decoded.data
      aTag = `${kind}:${pubkey}:${identifier}`
    } catch (error) {
      log(true, LogType.Error, 'Failed to decode naddr')
      return null
    }

    if (!aTag) {
      log(true, LogType.Error, 'Missing #a Tag')
      return null
    }

    const userState = store.getState().user
    let hexPubkey: string | undefined
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
    } else {
      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      toast.error('Failed to get the pubkey')
      return null
    }

    const isAdmin =
      userState.user?.npub &&
      userState.user.npub === import.meta.env.VITE_REPORTING_NPUB

    const handleBlock = async () => {
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
        // get a list of tags
        const tags = muteListEvent.tags
        const alreadyExists =
          tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1

        if (alreadyExists) {
          toast.warn(`Blog reference is already in user's mute list`)
          return null
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

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )

      if (!isUpdated) {
        toast.error("Failed to update user's mute list")
      }
      return null
    }

    const handleUnblock = async () => {
      const filter: NDKFilter = {
        kinds: [kinds.Mutelist],
        authors: [hexPubkey]
      }
      const muteListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )
      if (!muteListEvent) {
        toast.error(`Couldn't get user's mute list event from relays`)
        return null
      }

      const tags = muteListEvent.tags
      const unsignedEvent: UnsignedEvent = {
        pubkey: muteListEvent.pubkey,
        kind: kinds.Mutelist,
        content: muteListEvent.content,
        created_at: now(),
        tags: tags.filter((item) => item[0] !== 'a' || item[1] !== aTag)
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )
      if (!isUpdated) {
        toast.error("Failed to update user's mute list")
      }
      return null
    }
    const handleAddNSFW = async () => {
      const filter: NDKFilter = {
        kinds: [kinds.Curationsets],
        authors: [hexPubkey],
        '#d': ['nsfw']
      }

      const nsfwListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      let unsignedEvent: UnsignedEvent

      if (nsfwListEvent) {
        const tags = nsfwListEvent.tags
        const alreadyExists =
          tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1

        if (alreadyExists) {
          toast.warn(`Blog reference is already in user's nsfw list`)
          return null
        }

        tags.push(['a', aTag])

        unsignedEvent = {
          pubkey: nsfwListEvent.pubkey,
          kind: kinds.Curationsets,
          content: nsfwListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: kinds.Curationsets,
          content: '',
          created_at: now(),
          tags: [
            ['a', aTag],
            ['d', 'nsfw']
          ]
        }
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )
      if (!isUpdated) {
        toast.error("Failed to update user's nsfw list")
      }
      return null
    }
    const handleRemoveNSFW = async () => {
      const filter: NDKFilter = {
        kinds: [kinds.Curationsets],
        authors: [hexPubkey],
        '#d': ['nsfw']
      }

      const nsfwListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      if (!nsfwListEvent) {
        toast.error(`Couldn't get nsfw list event from relays`)
        return null
      }

      const tags = nsfwListEvent.tags

      const unsignedEvent: UnsignedEvent = {
        pubkey: nsfwListEvent.pubkey,
        kind: kinds.Curationsets,
        content: nsfwListEvent.content,
        created_at: now(),
        tags: tags.filter((item) => item[0] !== 'a' || item[1] !== aTag)
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )
      if (!isUpdated) {
        toast.error("Failed to update user's nsfw list")
      }
      return null
    }

    const requestData = (await request.json()) as {
      intent: 'nsfw' | 'block'
      value: boolean
    }

    switch (requestData.intent) {
      case 'block':
        await (requestData.value ? handleBlock() : handleUnblock())
        break

      case 'nsfw':
        if (!isAdmin) {
          log(true, LogType.Error, 'Unable to update NSFW list. No permission')
          return null
        }
        await (requestData.value ? handleAddNSFW() : handleRemoveNSFW())
        break

      default:
        log(true, LogType.Error, 'Missing intent for blog action')
        break
    }

    return null
  }
