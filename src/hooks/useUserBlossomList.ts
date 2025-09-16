import { NDKKind } from '@nostr-dev-kit/ndk'
import { useEffect, useState } from 'react'
import { UserRelaysType } from 'types'
import { log, LogType } from 'utils'
import { useNDKContext } from './useNDKContext'

export interface UserBlossom {
  id: string
  url: string
  isActive: boolean
}

export interface UserBlossomListResult {
  pubkey: string
  blossomServers: UserBlossom[]
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch blossom server list for a specific user by their pubkey
 * @param pubkey - The hexadecimal public key of the user
 * @returns UserBlossomListResult containing the user's blossom servers
 */
export const useUserBlossomList = (pubkey?: string): UserBlossomListResult => {
  const { fetchEventFromUserRelays } = useNDKContext()
  const [blossomServers, setBlossomServers] = useState<UserBlossom[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pubkey) {
      setBlossomServers([])
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchUserBlossomList = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch the user's blossom list event (kind 10063)
        const blossomListEvent = await fetchEventFromUserRelays(
          {
            kinds: [NDKKind.BlossomList],
            authors: [pubkey]
          },
          pubkey,
          UserRelaysType.Read
        )

        if (blossomListEvent) {
          // Extract blossom servers from both 'server' (BUD-03) and 'r' (backwards compatibility) tags
          const servers: UserBlossom[] = []
          const serverTags = blossomListEvent.getMatchingTags('server')
          const rTags = blossomListEvent.getMatchingTags('r')

          // Process 'server' tags first (BUD-03 standard)
          serverTags.forEach((tag, index) => {
            if (tag[1]) {
              servers.push({
                id: `${pubkey}-server-${index}`,
                url: tag[1],
                isActive: true // Assume all servers in the list are active
              })
            }
          })

          // Process 'r' tags for backwards compatibility
          rTags.forEach((tag, index) => {
            if (tag[1]) {
              // Check if this URL is already added from 'server' tags to avoid duplicates
              const urlExists = servers.some((server) => server.url === tag[1])
              if (!urlExists) {
                servers.push({
                  id: `${pubkey}-r-${index}`,
                  url: tag[1],
                  isActive: true // Assume all servers in the list are active
                })
              }
            }
          })

          setBlossomServers(servers)
        } else {
          // No blossom list found for this user
          setBlossomServers([])
        }
      } catch (err) {
        const errorMessage = `Failed to fetch blossom list for user ${pubkey.slice(0, 8)}...`
        log(true, LogType.Error, errorMessage, err)
        setError(errorMessage)
        setBlossomServers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserBlossomList()
  }, [pubkey, fetchEventFromUserRelays])

  return {
    pubkey: pubkey || '',
    blossomServers,
    isLoading,
    error
  }
}
