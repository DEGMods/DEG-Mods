/**
 * Image loading utilities that handle blossom server responses
 * Converts problematic responses (206, 302) to blob URLs that browsers can display
 */

import { validateImageContent } from './imageValidation'

interface ImageLoadResult {
  success: boolean
  url: string
  originalUrl: string
  status?: number
  error?: string
  isBlobUrl?: boolean
}

/**
 * Cache for blob URLs to avoid re-downloading the same images
 */
const blobUrlCache = new Map<string, string>()

/**
 * Loads an image and handles blossom server responses by converting to blob URLs
 * @param url - The image URL to load
 * @returns Promise resolving to ImageLoadResult
 */
export const loadImageWithBlossomSupport = async (
  url: string
): Promise<ImageLoadResult> => {
  console.log(`[ImageLoader] Loading image: ${url}`)

  // Check cache first
  if (blobUrlCache.has(url)) {
    const cachedBlobUrl = blobUrlCache.get(url)!
    console.log(`[ImageLoader] Using cached blob URL for: ${url}`)
    return {
      success: true,
      url: cachedBlobUrl,
      originalUrl: url,
      isBlobUrl: true
    }
  }

  try {
    // First, validate the image to see what response we get
    const isValid = await validateImageContent(url)
    if (!isValid) {
      return {
        success: false,
        url,
        originalUrl: url,
        error: 'Image validation failed'
      }
    }

    // Try a HEAD request to check the response status
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors'
      }
    })

    console.log(`[ImageLoader] HEAD response status: ${headResponse.status}`)

    // If it's a standard 200 response, use the original URL
    if (headResponse.status === 200) {
      return {
        success: true,
        url,
        originalUrl: url,
        status: 200
      }
    }

    // For 206, 302, or other non-200 responses, download and create blob URL
    if (
      headResponse.status === 206 ||
      headResponse.status === 302 ||
      headResponse.status === 301
    ) {
      console.log(
        `[ImageLoader] Converting ${headResponse.status} response to blob URL`
      )

      const blobUrl = await downloadAndCreateBlobUrl(url)
      if (blobUrl) {
        // Cache the blob URL
        blobUrlCache.set(url, blobUrl)

        return {
          success: true,
          url: blobUrl,
          originalUrl: url,
          status: headResponse.status,
          isBlobUrl: true
        }
      }
    }

    // If we get here, try the original URL anyway (might work in browser)
    return {
      success: true,
      url,
      originalUrl: url,
      status: headResponse.status
    }
  } catch (error) {
    console.error(`[ImageLoader] Error loading image ${url}:`, error)
    return {
      success: false,
      url,
      originalUrl: url,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Downloads an image and creates a blob URL
 * @param url - The image URL to download
 * @returns Promise resolving to blob URL or null if failed
 */
async function downloadAndCreateBlobUrl(url: string): Promise<string | null> {
  try {
    console.log(`[ImageLoader] Downloading image for blob conversion: ${url}`)

    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors'
      }
    })

    // Accept 200, 206, and other success-ish responses
    if (!response.ok && response.status !== 206) {
      console.error(
        `[ImageLoader] Download failed with status: ${response.status}`
      )
      return null
    }

    const blob = await response.blob()

    // Verify it's actually an image
    if (!blob.type.startsWith('image/')) {
      // Try to detect image type from content if type is missing
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Check for image signatures
      let detectedType = 'image/jpeg' // default fallback

      // JPEG: FF D8 FF
      if (
        uint8Array[0] === 0xff &&
        uint8Array[1] === 0xd8 &&
        uint8Array[2] === 0xff
      ) {
        detectedType = 'image/jpeg'
      }
      // PNG: 89 50 4E 47
      else if (
        uint8Array[0] === 0x89 &&
        uint8Array[1] === 0x50 &&
        uint8Array[2] === 0x4e &&
        uint8Array[3] === 0x47
      ) {
        detectedType = 'image/png'
      }
      // GIF: 47 49 46
      else if (
        uint8Array[0] === 0x47 &&
        uint8Array[1] === 0x49 &&
        uint8Array[2] === 0x46
      ) {
        detectedType = 'image/gif'
      }
      // WebP: RIFF...WEBP
      else if (
        uint8Array[0] === 0x52 &&
        uint8Array[1] === 0x49 &&
        uint8Array[2] === 0x46 &&
        uint8Array[3] === 0x46 &&
        uint8Array[8] === 0x57 &&
        uint8Array[9] === 0x45 &&
        uint8Array[10] === 0x42 &&
        uint8Array[11] === 0x50
      ) {
        detectedType = 'image/webp'
      }

      // Create new blob with detected type
      const typedBlob = new Blob([arrayBuffer], { type: detectedType })
      const blobUrl = URL.createObjectURL(typedBlob)

      console.log(
        `[ImageLoader] Created blob URL with detected type ${detectedType}: ${blobUrl}`
      )
      return blobUrl
    }

    const blobUrl = URL.createObjectURL(blob)
    console.log(`[ImageLoader] Created blob URL: ${blobUrl}`)
    return blobUrl
  } catch (error) {
    console.error(`[ImageLoader] Failed to create blob URL for ${url}:`, error)
    return null
  }
}

/**
 * Cleans up blob URLs to prevent memory leaks
 * @param blobUrl - The blob URL to revoke
 */
export const cleanupBlobUrl = (blobUrl: string) => {
  if (blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl)

    // Remove from cache
    for (const [originalUrl, cachedBlobUrl] of blobUrlCache.entries()) {
      if (cachedBlobUrl === blobUrl) {
        blobUrlCache.delete(originalUrl)
        break
      }
    }

    console.log(`[ImageLoader] Cleaned up blob URL: ${blobUrl}`)
  }
}

/**
 * Clears all cached blob URLs
 */
export const clearBlobUrlCache = () => {
  for (const blobUrl of blobUrlCache.values()) {
    URL.revokeObjectURL(blobUrl)
  }
  blobUrlCache.clear()
  console.log(`[ImageLoader] Cleared blob URL cache`)
}
