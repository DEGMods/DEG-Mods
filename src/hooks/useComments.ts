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
        const eTags = ndkEvent.getMatchingTags('e')
        const aTags = ndkEvent.getMatchingTags('a')

        // This event is not a reply to, nor does it refer to any other event
        if (!aTags.length && !eTags.length) return

        setCommentEvents((prev) => {
          if (ndkEvent.kind === NDKKind.Text) {
            // Resolve comments with markers and positional "e" tags
            // https://github.com/nostr-protocol/nips/blob/master/10.md
            const root = ndkEvent.getMatchingTags('e', 'root')
            const replies = ndkEvent.getMatchingTags('e', 'reply')

            // This event has reply markers but does not match eTag
            if (replies.length && !replies.some((e) => eTag === e[1])) {
              return [...prev]
            }

            // This event has a single #e tag reference
            // Checks single marked event (root) and a single positional "e" tags
            // Allow if either old kind 1 reply to addressable or matches eTag
            if (eTags.length === 1 && !(aTag || eTag === eTags[0][1])) {
              return [...prev]
            }

            // Position "e" tags (no markets)
            // Multiple e tags, checks the last "e" tag
            // Last "e" tag does not match eTag
            if (
              root.length + replies.length === 0 &&
              eTags.length > 1 &&
              eTags[eTags.length - 1][1] !== eTag
            ) {
              return [...prev]
            }
          }

          // Event is already included
          if (prev.find((comment) => comment.event.id === ndkEvent.id)) {
            return [...prev]
          }

          // Event is a direct reply
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
