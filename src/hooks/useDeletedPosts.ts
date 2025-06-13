import { useEffect, useState } from 'react'
import { NDKFilter, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { useNDKContext } from './useNDKContext'
import { NDKEvent } from '@nostr-dev-kit/ndk'

/**
 * Hook to check if posts have been deleted by their authors
 * @param posts - Array of posts to check for deletion
 * @returns Object containing:
 *   - deletedPostIds: Set of post IDs that have been deleted
 *   - loading: boolean indicating if the deletion check is in progress
 */
export const useDeletedPosts = (
  posts: NDKEvent[]
): { deletedPostIds: Set<string>; loading: boolean } => {
  const { ndk } = useNDKContext()
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const main = async () => {
      setLoading(true)

      if (!posts.length) {
        setLoading(false)
        return
      }

      try {
        // Create a map of author to their post IDs
        const authorToPostIds = new Map<string, string[]>()
        posts.forEach((post) => {
          if (post.id && post.pubkey) {
            const existing = authorToPostIds.get(post.pubkey) || []
            authorToPostIds.set(post.pubkey, [...existing, post.id])
          }
        })

        // For each author, fetch their kind 5 events
        const deletedIds = new Set<string>()
        for (const [author, postIds] of authorToPostIds) {
          const filter: NDKFilter = {
            kinds: [5],
            authors: [author],
            '#e': postIds
          }

          const deletionEvents = await ndk.fetchEvents(filter, {
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
          })

          // Add any post IDs that have deletion events to the set
          deletionEvents.forEach((event) => {
            const eTags = event.getMatchingTags('e')
            eTags.forEach((tag) => {
              if (postIds.includes(tag[1])) {
                deletedIds.add(tag[1])
              }
            })
          })
        }

        setDeletedPostIds(deletedIds)
      } catch (error) {
        console.error('Failed to check deletion status:', error)
      } finally {
        setLoading(false)
      }
    }

    main().catch(console.error)
  }, [posts, ndk])

  return { deletedPostIds, loading }
}
