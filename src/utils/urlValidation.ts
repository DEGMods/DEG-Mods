/**
 * Validates URLs using HEAD requests to check if they are accessible
 */

export interface UrlValidationResult {
  url: string
  isValid: boolean
  status?: number
  contentType?: string
  contentLength?: number
  error?: string
}

/**
 * Validates a single URL using a HEAD request
 * @param url - The URL to validate
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Promise<UrlValidationResult>
 */
export const validateUrl = async (
  url: string,
  timeout: number = 10000
): Promise<UrlValidationResult> => {
  try {
    // Basic URL format validation
    const urlObj = new URL(url)

    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        url,
        isValid: false,
        error: 'Only HTTP and HTTPS protocols are allowed'
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        // Add headers to avoid being blocked by some servers
        headers: {
          'User-Agent': 'DEGMods-Bot/1.0'
        }
      })

      clearTimeout(timeoutId)

      const result: UrlValidationResult = {
        url,
        isValid: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || undefined,
        contentLength: response.headers.get('content-length')
          ? parseInt(response.headers.get('content-length')!, 10)
          : undefined
      }

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`
      }

      return result
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return {
            url,
            isValid: false,
            error: `Request timeout after ${timeout}ms`
          }
        }
        return {
          url,
          isValid: false,
          error: fetchError.message
        }
      }

      return {
        url,
        isValid: false,
        error: 'Unknown fetch error'
      }
    }
  } catch (urlError) {
    return {
      url,
      isValid: false,
      error: urlError instanceof Error ? urlError.message : 'Invalid URL format'
    }
  }
}

/**
 * Validates multiple URLs in parallel
 * @param urls - Array of URLs to validate
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Promise<UrlValidationResult[]>
 */
export const validateUrls = async (
  urls: string[],
  timeout: number = 10000
): Promise<UrlValidationResult[]> => {
  const validationPromises = urls.map((url) => validateUrl(url, timeout))
  return Promise.all(validationPromises)
}

/**
 * Filters an array of URLs to return only the valid ones
 * @param urls - Array of URLs to validate and filter
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Promise<string[]> - Array of valid URLs
 */
export const getValidUrls = async (
  urls: string[],
  timeout: number = 10000
): Promise<string[]> => {
  const results = await validateUrls(urls, timeout)
  return results.filter((result) => result.isValid).map((result) => result.url)
}

/**
 * Checks if a URL appears to be a download link based on file extension
 * @param url - The URL to check
 * @returns boolean
 */
export const isDownloadUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()

    // Common download file extensions
    const downloadExtensions = [
      '.zip',
      '.rar',
      '.7z',
      '.tar',
      '.gz',
      '.bz2',
      '.exe',
      '.msi',
      '.dmg',
      '.pkg',
      '.deb',
      '.rpm',
      '.apk',
      '.ipa',
      '.jar',
      '.war',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.mp3',
      '.mp4',
      '.avi',
      '.mkv',
      '.mov',
      '.wmv',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.svg',
      '.mod',
      '.pak',
      '.wad',
      '.bsp'
    ]

    return downloadExtensions.some((ext) => pathname.endsWith(ext))
  } catch {
    return false
  }
}
