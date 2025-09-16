import { useEffect, useState, useMemo } from 'react'
import { CommentEvent, UserRelaysType } from 'types'
import { UserBlossom } from './useUserBlossomList'
import { useNDKContext } from './useNDKContext'
import { NDKKind } from '@nostr-dev-kit/ndk'
import { log, LogType } from 'utils'

export interface CommentUserBlossom {
  pubkey: string
  displayName?: string
  blossomServers: UserBlossom[]
  isLoading: boolean
  error: string | null
}

export interface CompiledBlossomList {
  /** All unique blossom servers from all comment users */
  allServers: UserBlossom[]
  /** Blossom servers grouped by user */
  userServers: CommentUserBlossom[]
  /** Overall loading state */
  isLoading: boolean
  /** Any errors that occurred */
  errors: string[]
  /** Statistics about the compiled list */
  stats: {
    totalUsers: number
    usersWithServers: number
    uniqueServers: number
    totalServers: number
  }
}

/**
 * Hook to compile blossom server lists from all users who commented on a post
 * @param commentEvents - Array of comment events
 * @returns CompiledBlossomList containing aggregated blossom server data
 */
export const useCommentUsersBlossomList = (
  commentEvents: CommentEvent[]
): CompiledBlossomList => {
  const { fetchEventFromUserRelays } = useNDKContext()
  const [compiledData, setCompiledData] = useState<CompiledBlossomList>({
    allServers: [],
    userServers: [],
    isLoading: false,
    errors: [],
    stats: {
      totalUsers: 0,
      usersWithServers: 0,
      uniqueServers: 0,
      totalServers: 0
    }
  })

  // Extract unique pubkeys from comment events
  const uniquePubkeys = useMemo(() => {
    const pubkeys = new Set<string>()
    commentEvents.forEach((comment) => {
      if (comment.event.pubkey) {
        pubkeys.add(comment.event.pubkey)
      }
    })
    return Array.from(pubkeys)
  }, [commentEvents])

  useEffect(() => {
    const fetchAllBlossomLists = async () => {
      // Early return if no commenters to fetch blossom lists for
      if (uniquePubkeys.length === 0) {
        setCompiledData((prev) => ({ ...prev, isLoading: false }))
        return
      }
      setCompiledData((prev) => ({ ...prev, isLoading: true, errors: [] }))

      const allServers: UserBlossom[] = []
      const userServers: CommentUserBlossom[] = []
      const errors: string[] = []
      const serverUrls = new Set<string>()
      let usersWithServers = 0
      let totalServers = 0

      // Fetch blossom lists for all users in parallel
      const fetchPromises = uniquePubkeys.map(async (pubkey) => {
        try {
          const blossomListEvent = await fetchEventFromUserRelays(
            {
              kinds: [NDKKind.BlossomList],
              authors: [pubkey]
            },
            pubkey,
            UserRelaysType.Read
          )

          const blossomServers: UserBlossom[] = []

          if (blossomListEvent) {
            // Extract blossom servers from both 'server' (BUD-03) and 'r' (backwards compatibility) tags
            const serverTags = blossomListEvent.getMatchingTags('server')
            const rTags = blossomListEvent.getMatchingTags('r')
            const addedUrls = new Set<string>()

            // Process 'server' tags first (BUD-03 standard)
            serverTags.forEach((tag, index) => {
              if (tag[1] && !addedUrls.has(tag[1])) {
                const server = {
                  id: `${pubkey}-server-${index}`,
                  url: tag[1],
                  isActive: true
                }
                blossomServers.push(server)
                addedUrls.add(tag[1])
              }
            })

            // Process 'r' tags for backwards compatibility
            rTags.forEach((tag, index) => {
              if (tag[1] && !addedUrls.has(tag[1])) {
                const server = {
                  id: `${pubkey}-r-${index}`,
                  url: tag[1],
                  isActive: true
                }
                blossomServers.push(server)
                addedUrls.add(tag[1])
              }
            })
          }

          return {
            pubkey,
            blossomServers,
            error: null
          }
        } catch (err) {
          const errorMessage = `Failed to fetch blossom list for user ${pubkey.slice(0, 8)}...`
          log(true, LogType.Error, errorMessage, err)
          return {
            pubkey,
            blossomServers: [],
            error: errorMessage
          }
        }
      })

      try {
        const results = await Promise.all(fetchPromises)

        results.forEach((result) => {
          if (result.error) {
            errors.push(result.error)
          }

          const userBlossom: CommentUserBlossom = {
            pubkey: result.pubkey,
            displayName: undefined,
            blossomServers: result.blossomServers,
            isLoading: false,
            error: result.error
          }

          userServers.push(userBlossom)

          if (result.blossomServers.length > 0) {
            usersWithServers++
            totalServers += result.blossomServers.length

            // Add unique servers to the compiled list
            result.blossomServers.forEach((server) => {
              if (!serverUrls.has(server.url)) {
                serverUrls.add(server.url)
                allServers.push({
                  ...server,
                  id: `compiled-${server.url.replace(/[^a-zA-Z0-9]/g, '-')}`
                })
              }
            })
          }
        })

        setCompiledData({
          allServers,
          userServers,
          isLoading: false,
          errors,
          stats: {
            totalUsers: uniquePubkeys.length,
            usersWithServers,
            uniqueServers: allServers.length,
            totalServers
          }
        })
      } catch (err) {
        const errorMessage = 'Failed to fetch blossom lists for comment users'
        log(true, LogType.Error, errorMessage, err)
        setCompiledData((prev) => ({
          ...prev,
          isLoading: false,
          errors: [errorMessage]
        }))
      }
    }

    fetchAllBlossomLists().catch((error) => {
      setCompiledData((prev) => ({
        ...prev,
        isLoading: false,
        errors: [
          ...prev.errors,
          `Failed to fetch blossom lists: ${error.message}`
        ]
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniquePubkeys.join(','), fetchEventFromUserRelays])

  return compiledData
}
