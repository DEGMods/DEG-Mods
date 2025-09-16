/**
 * Utility functions for SHA256 hash-based content blocking
 */

/**
 * Extracts SHA256 hash from a URL if present
 * @param url - The URL to extract hash from
 * @returns The SHA256 hash if found, null otherwise
 */
export const extractHashFromUrl = (url: string): string | null => {
  try {
    // Pattern to match SHA256 hash in URL path (64 hex characters)
    const hashRegex = /\/([a-fA-F0-9]{64})(?:\.[a-zA-Z0-9]+)?(?:\/|$)/
    const match = url.match(hashRegex)

    if (match && match[1]) {
      return match[1].toLowerCase()
    }

    // Also check for hash at the end of the path
    const endHashRegex = /\/([a-fA-F0-9]{64})(?:\.[a-zA-Z0-9]+)?$/
    const endMatch = url.match(endHashRegex)

    if (endMatch && endMatch[1]) {
      return endMatch[1].toLowerCase()
    }

    return null
  } catch (error) {
    console.warn('Failed to extract hash from URL:', url, error)
    return null
  }
}

/**
 * Checks if a URL contains a blocked file hash
 * @param url - The URL to check
 * @param blockedHashes - Array of blocked SHA256 hashes
 * @returns True if the URL contains a blocked hash, false otherwise
 */
export const isUrlBlocked = (url: string, blockedHashes: string[]): boolean => {
  if (!blockedHashes.length) {
    return false
  }

  const hash = extractHashFromUrl(url)
  if (!hash) {
    return false
  }

  // Convert all hashes to lowercase for comparison
  const normalizedBlockedHashes = blockedHashes.map((h) => h.toLowerCase())
  return normalizedBlockedHashes.includes(hash)
}

/**
 * Filters out URLs that contain blocked file hashes
 * @param urls - Array of URLs to filter
 * @param blockedHashes - Array of blocked SHA256 hashes
 * @returns Array of URLs that don't contain blocked hashes
 */
export const filterBlockedUrls = (
  urls: string[],
  blockedHashes: string[]
): string[] => {
  if (!blockedHashes.length) {
    return urls
  }

  return urls.filter((url) => !isUrlBlocked(url, blockedHashes))
}

/**
 * Validates if a string is a valid SHA256 hash
 * @param hash - The string to validate
 * @returns True if it's a valid SHA256 hash, false otherwise
 */
export const isValidSha256Hash = (hash: string): boolean => {
  const sha256Regex = /^[a-fA-F0-9]{64}$/
  return sha256Regex.test(hash)
}
