import { UserBlossom } from '../hooks/useUserBlossomList'
import { Blossom } from '../hooks/useBlossomList'

/**
 * Convert commenter blossom servers to the format expected by blossom hash search
 * @param commenterServers - Array of UserBlossom objects from commenters
 * @returns Array of Blossom objects compatible with blossom hash search functions
 */
export const convertCommenterServersToBlossomFormat = (
  commenterServers: UserBlossom[]
): Blossom[] => {
  return commenterServers.map((server, index) => ({
    id: server.id || `commenter-${index}`,
    url: server.url,
    isActive: server.isActive
  }))
}

/**
 * Get all unique blossom servers from commenter data
 * @param allCommenterServers - All servers from all commenters
 * @returns Deduplicated array of blossom servers
 */
export const getUniqueCommenterBlossomServers = (
  allCommenterServers: UserBlossom[]
): Blossom[] => {
  const uniqueServers = new Map<string, Blossom>()

  allCommenterServers.forEach((server, index) => {
    if (!uniqueServers.has(server.url)) {
      uniqueServers.set(server.url, {
        id: server.id || `commenter-${index}`,
        url: server.url,
        isActive: server.isActive
      })
    }
  })

  return Array.from(uniqueServers.values())
}
