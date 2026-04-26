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

  // Exclude bs.degmods.com from the search list to reduce server load.
  // Files on bs.degmods.com are still reachable via the fallbackUrl in
  // findAllDownloadUrls, so nothing breaks for un-mirrored files.
  const EXCLUDED_HOST = 'bs.degmods.com'
  const filtered = uniqueServers.filter((u) => !u.includes(EXCLUDED_HOST))



  return filtered
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
 * Check if a hash exists on a specific server using Image element probing.
 * This bypasses CORS issues since browsers don't enforce CORS on &lt;img&gt; loads.
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

    // Build URLs to try — with extension first, then without
    const possibleUrls: string[] = []
    if (preferredExtension) {
      possibleUrls.push(`${baseUrl}${hash}${preferredExtension}`)
    }
    // Always also try without extension as fallback
    possibleUrls.push(`${baseUrl}${hash}`)



    // Try each possible URL using HEAD request (works for all file types)
    for (const url of possibleUrls) {
      if (signal?.aborted) {

        return null
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        // Combine with parent signal
        if (signal) {
          signal.addEventListener('abort', () => controller.abort(), { once: true })
        }

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        })

        clearTimeout(timeoutId)



        if (response.ok) {
          console.log(`[BlossomSearch] ✓ Found on server: ${url}`)
          return url
        }
      } catch {

        continue
      }
    }

    return null
  } catch {
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


  if (!hash || hash.length !== 64) {
    const error = 'Invalid hash: must be 64-character SHA256 hash'
    throw new Error(error)
  }

  const results: ServerSearchResult[] = []
  const controller = new AbortController()

  // Set overall timeout for the search
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 6000) // 6 second total timeout

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
  _prioritizeOriginal: boolean = false
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



    // Check if fallback is bs.degmods.com
    const isDegmodsFallback = fallbackUrl.includes('bs.degmods.com')

    if (successfulResults.length > 0) {
      // Prefer non-degmods servers but include bs.degmods.com as fallback for downloads
      const nonDegmods = successfulResults.filter(
        (r) => !r.url.includes('bs.degmods.com')
      )

      if (nonDegmods.length > 0) {
        const workingUrls = nonDegmods.map((r) => r.url)
        // Include bs.degmods.com at the end as a fallback option for downloads
        const uniqueUrls = [...new Set([...workingUrls, fallbackUrl])]
        return uniqueUrls
      }
    }

    // No mirror alternatives found, use original bs.degmods.com URL
    if (isDegmodsFallback) {

      return [fallbackUrl]
    }


    return [fallbackUrl]
  } catch (error) {
    return [fallbackUrl]
  } finally {

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
