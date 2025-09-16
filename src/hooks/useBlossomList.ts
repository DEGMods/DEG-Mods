import { useLocalStorage } from './useLocalStorage'
import { useNDKContext } from './useNDKContext'
import { useAppSelector } from './redux'
import { useDidMount } from './useDidMount'
import { log, LogType, now } from '../utils'
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { Event, Filter, UnsignedEvent } from 'nostr-tools'
import { UserRelaysType } from '../types'
import isEqual from 'lodash/isEqual'

export interface BlossomListEvent {
  mirrors: Blossom[]
  eventId?: string
  createdAt?: number
}

export interface Blossom {
  id: string
  url: string
  isActive: boolean
}

export const useBlossomList = () => {
  const { ndk, fetchEventFromUserRelays, publish } = useNDKContext()
  const userState = useAppSelector((state) => state.user)

  // Local storage for fallback
  const [hostMirrors, setHostMirrors] = useLocalStorage<{
    mainHost: string
    mirrors: Blossom[]
  }>('host-mirrors', {
    mainHost: '',
    mirrors: []
  })

  // Default host mirrors localStorage for Blossom objects
  const [defaultHostMirrors, setDefaultHostMirrors] = useLocalStorage<
    Blossom[]
  >('default-host-mirrors', [
    {
      id: 'default-1',
      url: 'https://nostr.download/',
      isActive: true
    },
    {
      id: 'default-2',
      url: 'https://cdn.hzrd149.com/',
      isActive: true
    },
    {
      id: 'default-3',
      url: 'https://blossom.primal.net/',
      isActive: true
    }
  ])

  // Get user's pubkey
  const getUserPubKey = async (): Promise<string | null> => {
    if (userState.auth && userState.user?.pubkey) {
      return userState.user.pubkey as string
    } else {
      try {
        return (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
        return null
      }
    }
  }

  // Fetch existing blossom list event
  const fetchBlossomListEvent = async (
    userHexKey: string
  ): Promise<BlossomListEvent | null> => {
    const filter: Filter = {
      kinds: [NDKKind.BlossomList],
      authors: [userHexKey],
      limit: 1
    }

    const event = await fetchEventFromUserRelays(
      filter,
      userHexKey,
      UserRelaysType.Both
    )

    if (!event) return null

    try {
      const mirrors: Blossom[] = []
      for (const tag of event.tags) {
        // Support both 'server' (BUD-03 standard) and 'r' (backwards compatibility)
        if ((tag[0] === 'server' || tag[0] === 'r') && tag[1]) {
          const url = tag[1]
          mirrors.push({
            id: url,
            url,
            isActive: true
          })
        }
      }

      return {
        mirrors,
        eventId: event.id,
        createdAt: event.created_at
      }
    } catch (error) {
      log(
        true,
        LogType.Error,
        'Failed to parse blossom list event content',
        error
      )
      return null
    }
  }

  // Sign and publish event
  const signAndPublishEvent = async (
    unsignedEvent: UnsignedEvent
  ): Promise<boolean> => {
    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) return false

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    if (publishedOnRelays.length === 0) {
      return false
    }
    return true
  }

  // Create or update blossom list event
  const updateBlossomList = async (mirrors: Blossom[]): Promise<boolean> => {
    const userHexKey = await getUserPubKey()

    if (!userHexKey) {
      return false
    }

    const hostMirrorsSet = new Set(
      hostMirrors.mirrors.map((mirror) => mirror.url)
    )
    const newMirrorsSet = new Set(mirrors.map((mirror) => mirror.url))

    if (isEqual(hostMirrorsSet, newMirrorsSet)) {
      return false
    }

    // Get existing event to preserve any additional tags
    const existingEvent = await fetchBlossomListEvent(userHexKey)

    const tags = existingEvent?.eventId
      ? [['e', existingEvent.eventId, '', 'replace']]
      : []

    // Use 'server' tag for BUD-03 compliance
    for (const mirror of mirrors) {
      tags.push(['server', mirror.url])
    }

    const unsignedEvent: UnsignedEvent = {
      content: '',
      created_at: now(),
      kind: NDKKind.BlossomList,
      pubkey: userHexKey,
      tags
    }

    const success = await signAndPublishEvent(unsignedEvent)

    return success
  }

  // Load blossom list on mount
  useDidMount(async () => {
    if (userState.auth && userState.user?.pubkey) {
      const userHexKey = userState.user.pubkey as string
      const event = await fetchBlossomListEvent(userHexKey)

      if (event) {
        // Update local storage with Nostr event data
        setHostMirrors((prev) => ({
          ...prev,
          mirrors: event.mirrors
        }))
      }
    }
  })

  const handleSetHostMirrors = (mainHost: string, mirrors: Blossom[]) => {
    setHostMirrors((prev) => ({
      ...prev,
      mainHost,
      mirrors
    }))
    updateBlossomList(mirrors)
  }

  const handleSetDefaultHostMirrors = (defaultMirrors: Blossom[]) => {
    setDefaultHostMirrors(defaultMirrors)
  }

  // Return both local storage and Nostr event data
  return {
    hostMirrors,
    setHostMirrors: handleSetHostMirrors,
    defaultHostMirrors,
    setDefaultHostMirrors: handleSetDefaultHostMirrors
  }
}
