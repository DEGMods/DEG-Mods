import { useEffect, useState } from 'react'
import { NDKFilter, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { useNDKContext } from './useNDKContext'
import { BlogCardDetails } from 'types'

/**
 * Hook to check if blog posts have been deleted by their authors
 * @param blogs - Array of blog posts to check for deletion
 * @returns Object containing:
 *   - deletedBlogIds: Set of blog IDs that have been deleted
 *   - loading: boolean indicating if the deletion check is in progress
 */
export const useDeletedBlogs = (
  blogs: Partial<BlogCardDetails>[]
): { deletedBlogIds: Set<string>; loading: boolean } => {
  const { ndk } = useNDKContext()
  const [deletedBlogIds, setDeletedBlogIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const main = async () => {
      setLoading(true)

      if (!blogs.length) {
        setLoading(false)
        return
      }

      try {
        // Create a map of author to their blog IDs
        const authorToBlogIds = new Map<string, string[]>()
        blogs.forEach((blog) => {
          if (blog.id && blog.author) {
            const existing = authorToBlogIds.get(blog.author) || []
            authorToBlogIds.set(blog.author, [...existing, blog.id])
          }
        })

        // For each author, fetch their kind 5 events
        const deletedIds = new Set<string>()
        for (const [author, blogIds] of authorToBlogIds) {
          const filter: NDKFilter = {
            kinds: [5],
            authors: [author],
            '#e': blogIds
          }

          const deletionEvents = await ndk.fetchEvents(filter, {
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
          })

          // Add any blog IDs that have deletion events to the set
          deletionEvents.forEach((event) => {
            const eTags = event.getMatchingTags('e')
            eTags.forEach((tag) => {
              if (blogIds.includes(tag[1])) {
                deletedIds.add(tag[1])
              }
            })
          })
        }

        setDeletedBlogIds(deletedIds)
      } catch (error) {
        console.error('Failed to check deletion status:', error)
      } finally {
        setLoading(false)
      }
    }

    main().catch(console.error)
  }, [blogs, ndk])

  return { deletedBlogIds, loading }
}
