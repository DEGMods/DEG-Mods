import {
  getRelayListForUser,
  NDKFilter,
  NDKKind,
  NDKRelaySet,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { useEffect, useState, useMemo } from 'react'
import {
  CommentEvent,
  UserRelaysType,
  FilterOptions,
  CommentsFilterOptions,
  NSFWFilter
} from 'types'
import {
  DEFAULT_COMMENT_FILTER_OPTIONS,
  DEFAULT_FILTER_OPTIONS,
  log,
  LogType,
  timeout
} from 'utils'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useIsCommentWoT } from 'components/comment/useIsCommentWoT'
import { useNDKContext } from './useNDKContext'
import _ from 'lodash'

export const useComments = (
  author: string | undefined,
  aTag: string | undefined,
  eTag?: string | undefined
) => {
  const { ndk } = useNDKContext()
  const [filterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )
  const [commentFilterOptions] = useLocalStorage<CommentsFilterOptions>(
    'comment-filter',
    DEFAULT_COMMENT_FILTER_OPTIONS
  )
  const isCommentWot = useIsCommentWoT({
    ...commentFilterOptions,
    wot: filterOptions.wot
  })
  const [commentEvents, setCommentEvents] = useState<CommentEvent[]>([])
  const commentFlag = commentEvents.reduce((acc, comment) => {
    return acc + comment.event.content
  }, '')
  const filteredCommentEvents = useMemo(() => {
    if (!commentEvents.length) {
      return []
    }

    let filtered = commentEvents

    filtered = filtered.filter(isCommentWot)

    if (filterOptions.nsfw === NSFWFilter.Hide_NSFW) {
      filtered = filtered.filter((comment) => {
        const isNSFW = comment.event.tags.some((tag) => tag[0] === 'nsfw')
        return !isNSFW
      })
    } else if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filtered = filtered.filter((comment) => {
        const isNSFW = comment.event.tags.some((tag) => tag[0] === 'nsfw')
        return isNSFW
      })
    }

    if (filterOptions.source !== 'Show All') {
      filtered = filtered.filter((comment) => {
        const isFromSource = comment.event.tags.some(
          (tag) => tag[0] === 'r' && tag[1] === filterOptions.source
        )
        return isFromSource
      })
    }

    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentFlag, isCommentWot, filterOptions.nsfw, filterOptions.source])

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
        kinds: [NDKKind.GenericReply],
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

      subscription = ndk.subscribe(filter, {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
        relaySet: relayUrls.size
          ? NDKRelaySet.fromRelayUrls(Array.from(relayUrls), ndk)
          : undefined
      })

      subscription.on('event', (ndkEvent) => {
        const eTags = ndkEvent.getMatchingTags('e')
        const aTags = ndkEvent.getMatchingTags('a')

        // This event is not a reply to, nor does it refer to any other event
        if (!aTags.length && !eTags.length) return

        setCommentEvents((prev) => {
          if (ndkEvent.kind === NDKKind.GenericReply) {
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
            if (eTags.length === 1 && !(aTag || eTag === _.first(eTags)?.[1])) {
              return [...prev]
            }

            // Position "e" tags (no markers)
            // Multiple e tags, checks the last "e" tag
            // Last "e" tag does not match eTag
            if (
              root.length + replies.length === 0 &&
              eTags.length > 1 &&
              _.last(eTags)?.[1] !== eTag
            ) {
              return [...prev]
            }

            // "e" tags with markets
            // Multiple replies, checks the last "e" tag
            // Only show direct replies
            if (replies.length > 1 && _.last(replies)?.[1] !== eTag) {
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
    commentEvents: filteredCommentEvents,
    setCommentEvents
  }
}
