import {
  NDKEvent,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { useState } from 'react'
import { useNDKContext } from './useNDKContext'
import { useDidMount } from './useDidMount'

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
          return p
        })
        eDepth = previousReply.tagValue('e')
      } else {
        eDepth = undefined
      }
    }
    setIsComplete(true)
  })

  return {
    size: replies.length,
    isComplete,
    parent: replies.length > 0 ? replies[0] : undefined,
    root: isComplete ? replies[replies.length - 1] : undefined
  }
}
