import { ImageController, MEDIA_OPTIONS } from '../controllers/image'

/**
 * Validate if a URL is a valid blossom server URL
 * @param url - The URL to validate
 * @returns boolean - Whether the URL is valid
 */
export const isValidBlossomServerUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    // Must be HTTP or HTTPS
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Mirror a file hash to a specified blossom server
 * @param hash - The SHA-256 hash of the file to mirror
 * @param sourceUrl - The source URL where the file can be downloaded from
 * @param blossomServerUrl - The blossom server URL to mirror to (defaults to bs.degmods.com)
 * @returns Promise<'success' | 'error'> - The result of the mirror operation
 */
export const mirrorToBlossomServer = async (
  hash: string,
  sourceUrl: string,
  blossomServerUrl?: string
): Promise<'success' | 'error'> => {
  try {
    let imageController: ImageController

    if (blossomServerUrl) {
      // Use custom blossom server URL
      // Ensure URL ends with /
      const normalizedUrl = blossomServerUrl.endsWith('/')
        ? blossomServerUrl
        : `${blossomServerUrl}/`

      // Create a custom media option for the provided server
      // We'll assume it's a degmods-server type for compatibility
      const customBlossomOption = {
        name: 'custom-blossom',
        host: normalizedUrl,
        type: 'degmods-server' as const
      }

      imageController = new ImageController(customBlossomOption)
    } else {
      // Use default main blossom server (bs.degmods.com)
      const mainBlossomOption = MEDIA_OPTIONS.find(
        (option) => option.name === 'bs.degmods.com'
      )

      if (!mainBlossomOption) {
        console.error(
          'Main blossom server (bs.degmods.com) not found in MEDIA_OPTIONS'
        )
        return 'error'
      }

      imageController = new ImageController(mainBlossomOption)
    }

    // Check if the mirror method is available
    if (!imageController.mirror) {
      return 'error'
    }

    // Create an AbortController for timeout handling
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 30000) // 30 second timeout

    try {
      // Make the mirror request
      const result = await imageController.mirror(
        sourceUrl,
        hash,
        abortController.signal
      )
      clearTimeout(timeoutId)
      return result === 'success' ? 'success' : 'error'
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Mirror request failed:', error)
      return 'error'
    }
  } catch (error) {
    console.error('Error setting up mirror request:', error)
    return 'error'
  }
}
