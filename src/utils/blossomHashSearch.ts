import { MEDIA_OPTIONS } from '../controllers/image'
import { Blossom } from '../hooks/useBlossomList'
import { extractHashFromUrl } from './hashBlocking'

/**
 * Interface for server search results
 */
export interface ServerSearchResult {
  server: string
  url: string
  success: boolean
  error?: string
}

/**
 * Get all available blossom servers from configured options and personal lists
 * @param personalBlossomList - User's personal blossom server list
 * @param defaultBlossomList - Default blossom server list
 * @param commenterBlossomList - Blossom servers from users who commented on the post
 * @returns Array of server URLs
 */
export const getAllBlossomServers = (
  personalBlossomList: Blossom[] = [],
  defaultBlossomList: Blossom[] = [],
  commenterBlossomList: Blossom[] = []
): string[] => {
  // Get configured servers from MEDIA_OPTIONS
  const configuredServers = MEDIA_OPTIONS.map((option) => option.host)

  // Get active personal blossom servers
  const activePersonalServers = personalBlossomList
    .filter((blossom) => blossom.isActive)
    .map((blossom) => blossom.url)

  // Get active default blossom servers
  const activeDefaultServers = defaultBlossomList
    .filter((blossom) => blossom.isActive)
    .map((blossom) => blossom.url)

  // Get active commenter blossom servers
  const activeCommenterServers = commenterBlossomList
    .filter((blossom) => blossom.isActive)
    .map((blossom) => blossom.url)

  // Combine all servers and remove duplicates
  const allServers = [
    ...configuredServers,
    ...activePersonalServers,
    ...activeDefaultServers,
    ...activeCommenterServers
  ]

  // Remove duplicates and ensure URLs end with /
  const uniqueServers = Array.from(new Set(allServers)).map((url) =>
    url.endsWith('/') ? url : `${url}/`
  )

  return uniqueServers
}

/**
 * Extract file extension from a URL
 * @param url - The URL to extract extension from
 * @returns The file extension (including the dot) or empty string if none found
 */
const getFileExtensionFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const lastDotIndex = pathname.lastIndexOf('.')
    const lastSlashIndex = pathname.lastIndexOf('/')

    // Only return extension if the dot comes after the last slash
    if (lastDotIndex > lastSlashIndex && lastDotIndex !== -1) {
      const extension = pathname.substring(lastDotIndex)
      return extension
    }

    return ''
  } catch (error) {
    return ''
  }
}

/**
 * Check if a hash exists on a specific server
 * @param serverUrl - The blossom server URL
 * @param hash - The SHA256 hash to search for
 * @param preferredExtension - Preferred file extension to try first
 * @param signal - AbortSignal for request cancellation
 * @returns Promise resolving to the download URL if found, null if not found
 */
export const checkHashOnServer = async (
  serverUrl: string,
  hash: string,
  preferredExtension: string = '',
  signal?: AbortSignal
): Promise<string | null> => {
  try {
    // Normalize server URL
    const baseUrl = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`

    // Try different URL patterns for the hash, prioritizing the preferred extension
    const possibleUrls: string[] = []

    // If we have a preferred extension, try it first
    if (preferredExtension) {
      possibleUrls.push(`${baseUrl}${hash}${preferredExtension}`)
    } else {
      possibleUrls.push(`${baseUrl}${hash}`)
    }

    // Try each possible URL
    for (let i = 0; i < possibleUrls.length; i++) {
      const url = possibleUrls[i]

      try {
        // Use HEAD request to check if file exists
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        // Combine signals if provided (with fallback for older browsers)
        let combinedSignal = controller.signal
        if (signal) {
          // Use AbortSignal.any if available, otherwise just use the provided signal
          if (typeof AbortSignal.any === 'function') {
            combinedSignal = AbortSignal.any([signal, controller.signal])
          } else {
            combinedSignal = signal
          }
        }

        const response = await fetch(url, {
          method: 'HEAD',
          signal: combinedSignal,
          redirect: 'follow',
          headers: {
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors'
          }
        })

        clearTimeout(timeoutId)

        // Only accept 200 OK responses for hash verification
        if (response.status === 200) {
          return url
        }
      } catch (error) {
        // Continue to next URL if this one fails
        continue
      }
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Search for a file hash across multiple blossom servers in parallel
 * @param hash - The SHA256 hash to search for
 * @param servers - Array of server URLs to search
 * @param preferredExtension - Preferred file extension to try first
 * @param maxConcurrent - Maximum number of concurrent requests (default: 5)
 * @returns Promise resolving to array of successful download URLs
 */
export const searchHashAcrossServers = async (
  hash: string,
  servers: string[],
  preferredExtension: string = '',
  maxConcurrent: number = 5
): Promise<ServerSearchResult[]> => {
  console.debug(
    `[BlossomSearch] Starting search for hash ${hash} across ${servers.length} servers`
  )
  console.debug(
    `[BlossomSearch] Search parameters: preferredExtension=${preferredExtension}, maxConcurrent=${maxConcurrent}`
  )

  if (!hash || hash.length !== 64) {
    const error = 'Invalid hash: must be 64-character SHA256 hash'
    throw new Error(error)
  }

  const results: ServerSearchResult[] = []
  const controller = new AbortController()

  // Set overall timeout for the search
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 15000) // 15 second total timeout

  try {
    // Process servers in batches to limit concurrent requests
    for (let i = 0; i < servers.length; i += maxConcurrent) {
      const batch = servers.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(async (server) => {
        try {
          const url = await checkHashOnServer(
            server,
            hash,
            preferredExtension,
            controller.signal
          )
          const result = {
            server,
            url: url || '',
            success: url !== null,
            error: url ? undefined : 'File not found'
          }
          return result
        } catch (error) {
          const result = {
            server,
            url: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
          return result
        }
      })

      const batchResults = await Promise.all(batchPromises)

      results.push(...batchResults)
    }
  } finally {
    clearTimeout(timeoutId)
  }

  return results
}

/**
 * Find all working download URLs for a file hash
 * @param hash - The SHA256 hash to search for
 * @param fallbackUrl - Original URL to use if hash search fails
 * @param personalBlossomList - User's personal blossom server list
 * @param defaultBlossomList - Default blossom server list
 * @param commenterBlossomList - Blossom servers from users who commented on the post
 * @param prioritizeOriginal - If true, prioritizes the original URL even if hash doesn't match (for mod posts)
 * @returns Promise resolving to array of working download URLs (fallback URL first if no alternatives found)
 */
export const findAllDownloadUrls = async (
  hash: string,
  fallbackUrl: string,
  personalBlossomList: Blossom[] = [],
  defaultBlossomList: Blossom[] = [],
  commenterBlossomList: Blossom[] = [],
  prioritizeOriginal: boolean = false
): Promise<string[]> => {
  try {
    // If no hash provided, try to extract from fallback URL
    const searchHash = hash || extractHashFromUrl(fallbackUrl)

    if (!searchHash) {
      return [fallbackUrl]
    }

    // Extract file extension from the original URL to preserve it
    const preferredExtension = getFileExtensionFromUrl(fallbackUrl)

    // Get all available servers
    const servers = getAllBlossomServers(
      personalBlossomList,
      defaultBlossomList,
      commenterBlossomList
    )

    if (servers.length === 0) {
      return [fallbackUrl]
    }

    // Search for the hash across all servers with preferred extension
    const results = await searchHashAcrossServers(
      searchHash,
      servers,
      preferredExtension
    )

    // Get all successful results
    const successfulResults = results.filter((result) => result.success)

    if (successfulResults.length > 0) {
      const workingUrls = successfulResults.map((result) => result.url)

      // For mod posts, prioritize original URL even if hash doesn't match
      if (prioritizeOriginal) {
        // Return original URL first, then alternatives as fallbacks
        const uniqueUrls = [...new Set([fallbackUrl, ...workingUrls])]
        return uniqueUrls
      } else {
        // Default behavior: Return working URLs first, then fallback URL if it's not already included
        const uniqueUrls = [...new Set([...workingUrls, fallbackUrl])]
        return uniqueUrls
      }
    }

    return [fallbackUrl]
  } catch (error) {
    return [fallbackUrl]
  } finally {
    console.warn('Error finding download URLs:')
  }
}

/**
 * Find the best download URL for a file hash
 * @param hash - The SHA256 hash to search for
 * @param fallbackUrl - Original URL to use if hash search fails
 * @param personalBlossomList - User's personal blossom server list
 * @param defaultBlossomList - Default blossom server list
 * @param commenterBlossomList - Blossom servers from users who commented on the post
 * @param prioritizeOriginal - If true, prioritizes the original URL even if hash doesn't match (for mod posts)
 * @returns Promise resolving to the best available download URL
 */
export const findBestDownloadUrl = async (
  hash: string,
  fallbackUrl: string,
  personalBlossomList: Blossom[] = [],
  defaultBlossomList: Blossom[] = [],
  commenterBlossomList: Blossom[] = [],
  prioritizeOriginal: boolean = false
): Promise<string> => {
  // Use the new findAllDownloadUrls function and return the first URL
  const allUrls = await findAllDownloadUrls(
    hash,
    fallbackUrl,
    personalBlossomList,
    defaultBlossomList,
    commenterBlossomList,
    prioritizeOriginal
  )

  // Return the first URL (which will be the best alternative or fallback)
  return allUrls[0]
}
