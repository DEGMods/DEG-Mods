import {
  getRelayListForUser,
  NDKFilter,
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { useEffect, useState } from 'react'
import { CommentEvent, UserRelaysType } from 'types'
import { log, LogType, timeout } from 'utils'
import { useNDKContext } from './useNDKContext'

export const useComments = (
  author: string | undefined,
  aTag: string | undefined,
  eTag?: string | undefined
) => {
  const { ndk } = useNDKContext()
  const [commentEvents, setCommentEvents] = useState<CommentEvent[]>([])

  useEffect(() => {
    if (!(author && (aTag || eTag))) {
      // Author and aTag/eTag are required
      return
    }

    let subscription: NDKSubscription // Define the subscription variable here for cleanup

    const setupSubscription = async () => {
      // Find the mod author's relays.

      const authorReadRelays = await Promise.race([
        getRelayListForUser(author, ndk),
        timeout(10 * 1000) // add a 10 sec timeout
      ])
        .then((ndkRelayList) => {
          if (ndkRelayList) return ndkRelayList[UserRelaysType.Read]
          return [] // Return an empty array if ndkRelayList is undefined
        })
        .catch((err) => {
          log(
            false, // Too many failed requests, turned off for clarity
            LogType.Error,
            `An error occurred in fetching user's (${author}) ${UserRelaysType.Read}`,
            err
          )
          return [] as string[]
        })

      const filter: NDKFilter = {
        kinds: [NDKKind.Text, NDKKind.GenericReply],
        ...(aTag
          ? {
              '#a': [aTag]
            }
          : {}),
        ...(eTag
          ? {
              '#e': [eTag]
            }
          : {})
      }

      const relayUrls = new Set<string>()

      ndk.pool.urls().forEach((relayUrl) => {
        relayUrls.add(relayUrl)
      })

      authorReadRelays.forEach((relayUrl) => relayUrls.add(relayUrl))

      subscription = ndk.subscribe(
        filter,
        {
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
        },
        relayUrls.size
          ? NDKRelaySet.fromRelayUrls(Array.from(relayUrls), ndk)
          : undefined
      )

      subscription.on('event', (ndkEvent) => {
        setCommentEvents((prev) => {
          if (prev.find((e) => e.event.id === ndkEvent.id)) {
            return [...prev]
          }

          return [{ event: ndkEvent }, ...prev]
        })
      })

      subscription.start()
    }

    setupSubscription()

    // Cleanup function to stop the subscription on unmount
    return () => {
      if (subscription) {
        subscription.stop()
      }
    }
  }, [aTag, author, eTag, ndk])

  return {
    commentEvents,
    setCommentEvents
  }
}
