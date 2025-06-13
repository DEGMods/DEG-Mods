import { useEffect } from 'react'
import { NDKFilter, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'
import { useNDKContext } from './useNDKContext'
import { useState } from 'react'

/**
 * Hook to check if an event has been deleted by its author
 * @param eventId - The ID of the event to check
 * @param authorPubkey - The public key of the event's author
 * @returns Object containing:
 *   - isDeleted: boolean indicating if the event has been deleted
 *   - loading: boolean indicating if the deletion check is in progress
 */
export const useDeleted = (
  eventId: string | undefined,
  authorPubkey: string | undefined
): { isDeleted: boolean; loading: boolean } => {
  const { ndk } = useNDKContext()
  const [isDeleted, setIsDeleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const main = async () => {
      if (!eventId || !authorPubkey) {
        return
      }

      try {
        // Fetch any kind 5 events that reference this event and were created by its author
        const filter: NDKFilter = {
          kinds: [5],
          authors: [authorPubkey],
          '#e': [eventId]
        }

        const deletionEvents = await ndk.fetchEvents(filter, {
          closeOnEose: true,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        })

        // If we found any deletion events, the event has been deleted
        setIsDeleted(deletionEvents.size > 0)
      } catch (error) {
        console.error('Failed to check deletion status:', error)
      } finally {
        setLoading(false)
      }
    }

    main().catch(console.error)
  }, [eventId, authorPubkey, ndk])

  return { isDeleted, loading }
}
