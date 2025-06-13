import { useEffect, useState } from 'react'
import { NDKFilter, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { useNDKContext } from './useNDKContext'
import { ModDetails } from 'types'

/**
 * Hook to check if mods have been deleted by their authors
 * @param mods - Array of mods to check for deletion
 * @returns Object containing:
 *   - deletedModIds: Set of mod IDs that have been deleted
 *   - loading: boolean indicating if the deletion check is in progress
 */
export const useDeletedMods = (
  mods: ModDetails[]
): { deletedModIds: Set<string>; loading: boolean } => {
  const { ndk } = useNDKContext()
  const [deletedModIds, setDeletedModIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const main = async () => {
      setLoading(true)

      if (!mods.length) {
        setLoading(false)
        return
      }

      try {
        // Create a map of author to their mod IDs
        const authorToModIds = new Map<string, string[]>()
        mods.forEach((mod) => {
          const existing = authorToModIds.get(mod.author) || []
          authorToModIds.set(mod.author, [...existing, mod.id])
        })

        // For each author, fetch their kind 5 events
        const deletedIds = new Set<string>()
        for (const [author, modIds] of authorToModIds) {
          const filter: NDKFilter = {
            kinds: [5],
            authors: [author],
            '#e': modIds
          }

          const deletionEvents = await ndk.fetchEvents(filter, {
            closeOnEose: true,
            cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
          })

          // Add any mod IDs that have deletion events to the set
          deletionEvents.forEach((event) => {
            const eTags = event.getMatchingTags('e')
            eTags.forEach((tag) => {
              if (modIds.includes(tag[1])) {
                deletedIds.add(tag[1])
              }
            })
          })
        }

        setDeletedModIds(deletedIds)
      } catch (error) {
        console.error('Failed to check deletion status:', error)
      } finally {
        setLoading(false)
      }
    }

    main().catch(console.error)
  }, [mods, ndk])

  return { deletedModIds, loading }
}
