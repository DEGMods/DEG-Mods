import {
  NDKEvent,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { useMemo, useState } from 'react'
import { useNDKContext } from './useNDKContext'
import { useDidMount } from './useDidMount'
import _ from 'lodash'

export const useReplies = (eTag: string | undefined) => {
  const { ndk } = useNDKContext()
  const [replies, setReplies] = useState<NDKEvent[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useDidMount(async () => {
    if (!eTag) {
      setIsComplete(true)
      return
    }

    let eDepth: string | undefined = eTag
    while (eDepth) {
      const previousReply = await ndk.fetchEvent(
        {
          kinds: [NDKKind.Text, NDKKind.GenericReply],
          ids: [eDepth]
        },
        {
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
        }
      )
      if (previousReply) {
        setReplies((p) => {
          if (p.findIndex((p) => p.id === previousReply.id) === -1) {
            p.push(previousReply)
          }
          return [...p]
        })
        const eTags = previousReply.getMatchingTags('e')
        eDepth = _.last(eTags)?.[1]
      } else {
        eDepth = undefined
      }
    }
    setIsComplete(true)
  })

  const rootEvent = useMemo(() => {
    let rootETag: string | undefined
    for (const r of replies) {
      const root = r.getMatchingTags('e', 'root')
      if (root.length) {
        rootETag = root[0][1]
        break
      }
    }
    const rootEvent = replies.find((r) => r.id === rootETag)

    // Root: first reply/comment, target of "Main Post"
    // - addr: first comment
    // - notes: root comment (marker)
    return rootEvent
      ? rootEvent
      : isComplete
      ? replies[replies.length - 1]
      : undefined
  }, [isComplete, replies])

  const parentEvent = useMemo(() => {
    return replies.length > 0 ? replies[0] : undefined
  }, [replies])

  return {
    size: replies.length,
    isComplete,
    parent: parentEvent,
    root: rootEvent
  }
}
