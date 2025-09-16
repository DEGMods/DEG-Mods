/**
 * Image-specific validation utilities
 * Validates image content and detects fake 404 responses
 */

/**
 * Validates that a URL returns actual image content
 * Handles common blossom server responses like 206 Partial Content and 302 Found
 * @param url - The image URL to validate
 * @returns Promise resolving to true if valid image, false otherwise
 */
export const validateImageContent = async (url: string): Promise<boolean> => {
  try {
    // First try HEAD request
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow', // Follow redirects automatically
      headers: {
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors'
      }
    })

    // Handle common blossom server responses
    if (response.status === 206) {
      // 206 Partial Content - this is actually a success for blossom servers
      console.log(`[ImageValidation] Received 206 Partial Content from: ${url}`)
    } else if (response.status === 302 || response.status === 301) {
      // Handle redirects manually if needed
      const location = response.headers.get('location')
      if (location) {
        console.log(
          `[ImageValidation] Following redirect from ${url} to ${location}`
        )
        response = await fetch(location, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors'
          }
        })
      }
    } else if (!response.ok && response.status !== 206) {
      // If HEAD fails and it's not a 206, try a range request (common for blossom servers)
      console.log(
        `[ImageValidation] HEAD request failed with ${response.status}, trying range request`
      )
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors'
            // Note: Removed Range header to avoid 206 responses
          },
          redirect: 'follow'
        })
      } catch (rangeError) {
        console.warn(`[ImageValidation] Range request also failed:`, rangeError)
        return false
      }
    }

    // Accept 200, 206 (Partial Content), and 416 (Range Not Satisfiable) as valid
    const validStatuses = [200, 206, 416]
    if (!validStatuses.includes(response.status)) {
      console.warn(
        `[ImageValidation] Invalid response status: ${response.status}`
      )
      return false
    }

    // Check content type
    const contentType = response.headers.get('content-type')
    if (contentType) {
      // Be more lenient with content types - some blossom servers don't set them correctly
      if (
        !contentType.startsWith('image/') &&
        !contentType.includes('octet-stream') &&
        !contentType.includes('binary')
      ) {
        // Only warn, don't fail - some servers return incorrect content types
        console.warn(
          `[ImageValidation] Unexpected content type: ${contentType}, but continuing`
        )
      }
    }

    // Check content length (images should have reasonable size)
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)

      // Images smaller than 50 bytes are likely fake (reduced from 100)
      if (size < 50) {
        console.warn(
          `[ImageValidation] Suspiciously small image: ${size} bytes`
        )
        return false
      }

      // Images larger than 100MB are probably not web images (increased from 50MB)
      if (size > 100 * 1024 * 1024) {
        console.warn(
          `[ImageValidation] Suspiciously large image: ${size} bytes`
        )
        return false
      }
    }

    console.log(`[ImageValidation] ✓ Image validation passed for: ${url}`)
    return true
  } catch (error) {
    console.error('[ImageValidation] Error validating image content:', error)
    return false
  }
}

/**
 * Validates image file signatures by reading the first few bytes
 * @param file - The file to validate
 * @returns Promise resolving to true if valid image signature, false otherwise
 */
export const validateImageSignature = async (file: File): Promise<boolean> => {
  try {
    // Read first 12 bytes to check file signatures
    const arrayBuffer = await file.slice(0, 12).arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // JPEG signature: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return true
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return true
    }

    // GIF signature: GIF87a or GIF89a
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    ) {
      return true
    }

    // WebP signature: RIFF....WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return true
    }

    // BMP signature: BM
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return true
    }

    // SVG (check for XML declaration or <svg tag in first few bytes)
    const text = new TextDecoder().decode(bytes)
    if (text.includes('<?xml') || text.includes('<svg')) {
      return true
    }

    console.warn(
      '[ImageValidation] Unrecognized image signature:',
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
    )
    return false
  } catch (error) {
    console.error('[ImageValidation] Error validating image signature:', error)
    return false
  }
}

/**
 * Get expected file extensions for image URLs based on content
 * @param url - The image URL
 * @returns Array of possible extensions to try
 */
export const getImageExtensions = (url: string): string[] => {
  // Extract current extension from URL
  const urlObj = new URL(url)
  const pathname = urlObj.pathname
  const currentExt = pathname.substring(pathname.lastIndexOf('.')).toLowerCase()

  // Common image extensions in order of preference
  const commonExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

  // If URL already has an extension, try it first
  if (currentExt && commonExtensions.includes(currentExt)) {
    return [currentExt, ...commonExtensions.filter((ext) => ext !== currentExt)]
  }

  return commonExtensions
}

/**
 * Check if a URL looks like an image based on extension or content type
 * @param url - The URL to check
 * @returns True if URL appears to be an image
 */
export const looksLikeImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()

    // Check for image extensions
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
      '.ico'
    ]
    return imageExtensions.some((ext) => pathname.endsWith(ext))
  } catch {
    return false
  }
}
