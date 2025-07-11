import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { HARD_BLOCK_LIST_KIND, HARD_BLOCK_TAG } from 'constants.ts'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19, UnsignedEvent } from 'nostr-tools'
import { ActionFunctionArgs } from 'react-router-dom'
import { toast } from 'react-toastify'
import { store } from 'store'
import { UserRelaysType } from 'types'
import {
  addToCurationSet,
  CurationSetIdentifiers,
  log,
  LogType,
  now,
  removeFromCurationSet,
  signAndPublish
} from 'utils'

export const modRouteAction =
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

      // We encode mods naddr identifier as a whole aTag
      const { identifier } = decoded.data
      aTag = identifier
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

    // Parse the request body
    const formData = await request.json()
    const { data } = formData

    const handleDelete = async () => {
      try {
        // Verify that the user is the author of the mod post
        const [kind, author] = aTag.split(':')
        if (author !== hexPubkey) {
          toast.error(`Kind ${kind}: Only the author can delete this mod post`)
          return null
        }

        // Create and publish the deletion event
        const unsignedEvent: UnsignedEvent = {
          pubkey: hexPubkey,
          kind: 5, // Deletion event kind
          content: 'Requesting deletion of mod post',
          created_at: now(),
          tags: [
            ['e', data.tags.find((tag: string[]) => tag[0] === 'e')?.[1] || ''],
            ['a', aTag]
          ]
        }

        const isUpdated = await signAndPublish(
          unsignedEvent,
          ndkContext.ndk,
          ndkContext.publish
        )

        if (!isUpdated) {
          toast.error('Failed to publish deletion event')
          return null
        }

        toast.success('Mod post deletion requested')
        return null
      } catch (error) {
        log(true, LogType.Error, 'Failed to handle mod deletion', error)
        toast.error('Failed to delete mod post')
        return null
      }
    }

    const handleBlock = async () => {
      // Define the event filter to search for the user's mute list events.
      // We look for events of a specific kind (Mutelist) authored by the given hexPubkey.
      const filter: NDKFilter = {
        kinds: [NDKKind.MuteList],
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
          toast.warn(`Mod reference is already in user's mute list`)
          return null
        }

        tags.push(['a', aTag])

        unsignedEvent = {
          pubkey: muteListEvent.pubkey,
          kind: NDKKind.MuteList,
          content: muteListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: NDKKind.MuteList,
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
        kinds: [NDKKind.MuteList],
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
        kind: NDKKind.MuteList,
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
      const success = await addToCurationSet(
        {
          dTag: CurationSetIdentifiers.NSFW,
          pubkey: hexPubkey,
          ndkContext
        },
        aTag
      )
      log(true, LogType.Info, `ModAction - NSFW - Add - ${success}`)
      return null
    }

    const handleRemoveNSFW = async () => {
      const success = await removeFromCurationSet(
        {
          dTag: CurationSetIdentifiers.NSFW,
          pubkey: hexPubkey,
          ndkContext
        },
        aTag
      )
      log(true, LogType.Info, `ModAction - Repost - Remove - ${success}`)
      return null
    }

    const handleRepost = async () => {
      const success = await addToCurationSet(
        {
          dTag: CurationSetIdentifiers.Repost,
          pubkey: hexPubkey,
          ndkContext
        },
        aTag
      )
      log(true, LogType.Info, `ModAction - NSFW - Add - ${success}`)
      return null
    }

    const handleRemoveRepost = async () => {
      const success = await removeFromCurationSet(
        {
          dTag: CurationSetIdentifiers.Repost,
          pubkey: hexPubkey,
          ndkContext
        },
        aTag
      )
      log(true, LogType.Info, `ModAction - Repost - Remove - ${success}`)
      return null
    }

    const handleHardBlock = async () => {
      const filter: NDKFilter = {
        kinds: [HARD_BLOCK_LIST_KIND],
        authors: [hexPubkey],
        '#d': [HARD_BLOCK_TAG]
      }

      const hardBlockListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      let unsignedEvent: UnsignedEvent
      if (hardBlockListEvent) {
        const tags = hardBlockListEvent.tags
        const alreadyExists =
          tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1

        if (alreadyExists) {
          toast.warn(`Mod reference is already in hard block list`)
          return null
        }

        tags.push(['a', aTag])
        unsignedEvent = {
          pubkey: hardBlockListEvent.pubkey,
          kind: HARD_BLOCK_LIST_KIND,
          content: hardBlockListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: HARD_BLOCK_LIST_KIND,
          content: '',
          created_at: now(),
          tags: [
            ['d', HARD_BLOCK_TAG],
            ['a', aTag]
          ]
        }
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )

      if (!isUpdated) {
        toast.error('Failed to update hard block list')
      }
      return null
    }

    const handleHardUnblock = async () => {
      const filter: NDKFilter = {
        kinds: [HARD_BLOCK_LIST_KIND],
        authors: [hexPubkey],
        '#d': [HARD_BLOCK_TAG]
      }

      const hardBlockListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      if (!hardBlockListEvent) {
        toast.error(`Couldn't get hard block list event from relays`)
        return null
      }

      const tags = hardBlockListEvent.tags
      const filteredTags = tags.filter((item) => {
        if (item[0] === 'd' && item[1] === HARD_BLOCK_TAG) {
          return true
        }

        return !(item[0] === 'a' && item[1] === aTag)
      })
      const unsignedEvent: UnsignedEvent = {
        pubkey: hardBlockListEvent.pubkey,
        kind: HARD_BLOCK_LIST_KIND,
        content: hardBlockListEvent.content,
        created_at: now(),
        tags: filteredTags
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )

      if (!isUpdated) {
        toast.error('Failed to update hard block list')
      }
      return null
    }

    const requestData = formData as {
      intent:
        | 'nsfw'
        | 'block'
        | 'repost'
        | 'delete'
        | 'hardblock'
        | 'hardunblock'
      value: boolean
    }

    switch (requestData.intent) {
      case 'block':
        await (requestData.value ? handleBlock() : handleUnblock())
        break

      case 'hardblock':
        await (requestData.value ? handleHardBlock() : handleHardUnblock())
        break

      case 'repost':
        await (requestData.value ? handleRepost() : handleRemoveRepost())
        break

      case 'nsfw':
        if (!isAdmin) {
          log(true, LogType.Error, 'Unable to update NSFW list. No permission')
          return null
        }
        await (requestData.value ? handleAddNSFW() : handleRemoveNSFW())
        break

      case 'delete':
        await handleDelete()
        break

      default:
        log(true, LogType.Error, 'Missing intent for mod action')
        break
    }

    return null
  }
