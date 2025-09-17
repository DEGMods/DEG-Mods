import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import {
  HARD_BLOCK_LIST_KIND,
  HARD_BLOCK_TAG,
  ILLEGAL_BLOCK_LIST_KIND,
  ILLEGAL_BLOCK_TAG
} from 'constants.ts'
import { NDKContextType } from 'contexts/NDKContext'
import { nip19, UnsignedEvent } from 'nostr-tools'
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

    // Parse the request body
    const formData = await request.json()
    const { intent, data } = formData

    // Handle delete action
    if (intent === 'delete') {
      try {
        // Verify that the user is the author of the blog post
        const [kind, author] = aTag.split(':')
        if (author !== hexPubkey) {
          toast.error(`Kind ${kind}: Only the author can delete this blog post`)
          return null
        }

        // Create and publish the deletion event
        const unsignedEvent: UnsignedEvent = {
          pubkey: hexPubkey,
          kind: 5, // Deletion event kind
          content: 'Requesting deletion of blog post',
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

        toast.success('Blog post deletion requested')
        return null
      } catch (error) {
        log(true, LogType.Error, 'Failed to handle blog deletion', error)
        toast.error('Failed to delete blog post')
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
          toast.warn(`Blog reference is already in user's mute list`)
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
      const filter: NDKFilter = {
        kinds: [NDKKind.ArticleCurationSet],
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
          kind: NDKKind.ArticleCurationSet,
          content: nsfwListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: NDKKind.ArticleCurationSet,
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
        kinds: [NDKKind.ArticleCurationSet],
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
        kind: NDKKind.ArticleCurationSet,
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
          toast.warn(`Blog reference is already in hard block list`)
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

    const handleIllegalBlock = async () => {
      const filter: NDKFilter = {
        kinds: [ILLEGAL_BLOCK_LIST_KIND],
        authors: [hexPubkey],
        '#d': [ILLEGAL_BLOCK_TAG]
      }

      const illegalBlockListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      let unsignedEvent: UnsignedEvent
      if (illegalBlockListEvent) {
        const tags = illegalBlockListEvent.tags
        const alreadyExists =
          tags.findIndex((item) => item[0] === 'a' && item[1] === aTag) !== -1

        if (alreadyExists) {
          toast.warn(`Blog reference is already in illegal block list`)
          return null
        }

        tags.push(['a', aTag])
        unsignedEvent = {
          pubkey: illegalBlockListEvent.pubkey,
          kind: ILLEGAL_BLOCK_LIST_KIND,
          content: illegalBlockListEvent.content,
          created_at: now(),
          tags: [...tags]
        }
      } else {
        unsignedEvent = {
          pubkey: hexPubkey,
          kind: ILLEGAL_BLOCK_LIST_KIND,
          content: '',
          created_at: now(),
          tags: [
            ['d', ILLEGAL_BLOCK_TAG],
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
        toast.error('Failed to update illegal block list')
      }
      return null
    }

    const handleIllegalUnblock = async () => {
      const filter: NDKFilter = {
        kinds: [ILLEGAL_BLOCK_LIST_KIND],
        authors: [hexPubkey],
        '#d': [ILLEGAL_BLOCK_TAG]
      }

      const illegalBlockListEvent = await ndkContext.fetchEventFromUserRelays(
        filter,
        hexPubkey,
        UserRelaysType.Write
      )

      if (!illegalBlockListEvent) {
        toast.error(`Couldn't get illegal block list event from relays`)
        return null
      }

      const tags = illegalBlockListEvent.tags
      const filteredTags = tags.filter((item) => {
        if (item[0] === 'd' && item[1] === ILLEGAL_BLOCK_TAG) {
          return true
        }

        return !(item[0] === 'a' && item[1] === aTag)
      })
      const unsignedEvent: UnsignedEvent = {
        pubkey: illegalBlockListEvent.pubkey,
        kind: ILLEGAL_BLOCK_LIST_KIND,
        content: illegalBlockListEvent.content,
        created_at: now(),
        tags: filteredTags
      }

      const isUpdated = await signAndPublish(
        unsignedEvent,
        ndkContext.ndk,
        ndkContext.publish
      )

      if (!isUpdated) {
        toast.error('Failed to update illegal block list')
      }
      return null
    }

    const requestData = formData as {
      intent:
        | 'nsfw'
        | 'block'
        | 'delete'
        | 'hardblock'
        | 'hardunblock'
        | 'illegalblock'
        | 'illegalunblock'
      value: boolean
    }

    switch (requestData.intent) {
      case 'block':
        await (requestData.value ? handleBlock() : handleUnblock())
        break

      case 'hardblock':
        await (requestData.value ? handleHardBlock() : handleHardUnblock())
        break

      case 'illegalblock':
        await (requestData.value
          ? handleIllegalBlock()
          : handleIllegalUnblock())
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
