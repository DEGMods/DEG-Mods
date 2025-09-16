import { quickValidateUrl } from './fileValidation'

/**
 * Normalizes a given URL by performing the following operations:
 *
 * 1. Ensures that the URL has a protocol by defaulting to 'wss://' if no protocol is provided.
 * 2. Creates a `URL` object to easily manipulate and normalize the URL components.
 * 3. Normalizes the pathname by:
 *    - Replacing multiple consecutive slashes with a single slash.
 *    - Removing the trailing slash if it exists.
 * 4. Removes the port number if it is the default port for the protocol:
 *    - Port `80` for 'ws:' (WebSocket) protocol.
 *    - Port `443` for 'wss:' (WebSocket Secure) protocol.
 * 5. Sorts the query parameters alphabetically.
 * 6. Clears any fragment (hash) identifier from the URL.
 *
 * @param urlString - The URL string to be normalized.
 * @returns A normalized URL string.
 */
export function normalizeWebSocketURL(urlString: string): string {
  // If the URL string does not contain a protocol (e.g., "http://", "https://"),
  // prepend "wss://" (WebSocket Secure) by default.
  if (urlString.indexOf('://') === -1) urlString = 'wss://' + urlString

  // Create a URL object from the provided URL string.
  const url = new URL(urlString)

  // Normalize the pathname by replacing multiple consecutive slashes with a single slash.
  url.pathname = url.pathname.replace(/\/+/g, '/')

  // Remove the trailing slash from the pathname if it exists.
  if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)

  // Remove the port number if it is 80 for "ws:" protocol or 443 for "wss:" protocol, as these are default ports.
  if (
    (url.port === '80' && url.protocol === 'ws:') ||
    (url.port === '443' && url.protocol === 'wss:')
  )
    url.port = ''

  // Sort the search parameters alphabetically.
  url.searchParams.sort()

  // Clear any hash fragment from the URL.
  url.hash = ''

  // Return the normalized URL as a string.
  return url.toString()
}

export const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch (_) {
    return false
  }
}

export const isValidImageUrl = (url: string) => {
  const regex = /\.(jpeg|jpg|gif|png|ico|bmp|webp|avif|jxl)$/
  return regex.test(url)
}

export const isValidVideoUrl = (url: string) => {
  const regex = /\.(mp4|mkv|webm|mov)$/
  return regex.test(url)
}

export const isValidAudioUrl = (url: string) => {
  const regex = /\.(mp3|wav|ogg|aac)$/
  return regex.test(url)
}

export const isYoutubeLink = (url: string) => {
  const _url = new URL(url)
  return [
    'm.youtube.com',
    'youtube.com',
    'www.youtube.com',
    'youtube-nocookie.com',
    'www.youtube-nocookie.com',
    'youtu.be',
    'music.youtube.com'
  ].includes(_url.hostname)
}

const YOUTUBE_SIMPLE_REGEX =
  /(?:youtube(?:-nocookie)?\.com|youtu\.be)\/(?:(watch|v|e|embed|shorts|live)\/)?(?:attribution_link\?a=.*watch(?:%3Fv%3D))?(?<id>[\w-]+)/
export const getIdFromYoutubeLink = (url: string): string | null => {
  if (!isYoutubeLink(url)) return null

  const _url = new URL(url)

  let id = _url.searchParams.get('v')

  if (!id) {
    // Handle oembed
    const oembed = _url.searchParams.get('url')
    if (oembed && isYoutubeLink(oembed)) {
      id = getIdFromYoutubeLink(oembed)
    } else if (YOUTUBE_SIMPLE_REGEX.test(url)) {
      // Handle everything else
      const matches = url.match(YOUTUBE_SIMPLE_REGEX)
      if (matches?.groups?.id) id = matches?.groups.id
    }
  }

  return id
}

export const isReachable = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Extracts a filename from a given URL.
 *
 * @param url - The URL from which to extract the filename.
 * @returns The filename extracted from the URL. If no filename can be extracted, a default name is provided.
 */
export const getFilenameFromUrl = (url: string): string => {
  try {
    // Create a URL object to parse the provided URL string
    const urlObj = new URL(url)

    // Extract the pathname from the URL object
    const pathname = urlObj.pathname

    // Extract the filename from the pathname. The filename is the last segment after the last '/'
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1)

    // If no filename found, use default
    if (!filename) {
      return 'downloaded_file.zip'
    }

    // Check if the filename has an extension
    const hasExtension = filename.includes('.') && filename.lastIndexOf('.') > 0

    // If no extension, try to determine from common patterns or default to .zip for mod files
    if (!hasExtension) {
      // Check if it looks like a hash (common in blossom servers)
      const hashRegex = /^[a-fA-F0-9]{64}$/
      if (hashRegex.test(filename)) {
        return `${filename}.zip`
      }

      // Default to .zip extension for mod files
      return `${filename}.zip`
    }

    // Return the extracted filename with its extension
    return filename
  } catch (error) {
    console.warn('Failed to parse URL for filename extraction:', error)
    return 'downloaded_file.zip'
  }
}

/**
 * Gets the appropriate MIME type for a file extension
 * @param extension - File extension (with or without dot)
 * @returns MIME type string
 */
const getMimeTypeFromExtension = (extension: string): string => {
  const ext = extension.toLowerCase().replace('.', '')

  const mimeTypes: Record<string, string> = {
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    cab: 'application/vnd.ms-cab-compressed',
    iso: 'application/x-iso9660-image',
    tgz: 'application/gzip',
    exe: 'application/x-msdownload',
    apk: 'application/vnd.android.package-archive',
    ipa: 'application/octet-stream',
    bin: 'application/octet-stream',
    mod: 'application/octet-stream',
    pak: 'application/octet-stream',
    unity: 'application/octet-stream',
    game: 'application/octet-stream',
    dmg: 'application/x-apple-diskimage',
    sav: 'application/octet-stream',
    cfg: 'text/plain'
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Downloads a file from multiple URLs, trying each one in order until successful.
 * This handles the case where HEAD requests succeed but GET requests fail with 404.
 *
 * @param urls - Array of URLs to try in order.
 * @param filename - The name of the file to save as.
 */
export const downloadFileWithFallback = async (
  urls: string[],
  filename: string
) => {
  if (!urls || urls.length === 0) {
    throw new Error('No URLs provided for download')
  }

  let lastError: Error | null = null

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    try {
      // Extract file extension from filename
      const extension = filename.substring(filename.lastIndexOf('.'))
      const mimeType = getMimeTypeFromExtension(extension)

      // Fetch the file with proper handling of blossom server responses
      const response = await fetch(url, { redirect: 'follow' })

      // Handle blossom server responses: 200, 206 (Partial Content)
      const validStatuses = [200, 206]
      if (!validStatuses.includes(response.status)) {
        if (response.status === 404) {
          lastError = new Error(`HTTP 404: File not found at ${url}`)
          continue
        } else if (response.status === 302 || response.status === 301) {
          lastError = new Error(
            `HTTP ${response.status}: Redirect not handled at ${url}`
          )
          continue
        } else {
          lastError = new Error(`HTTP error! status: ${response.status}`)
          continue
        }
      }

      // Quick validation to detect fake 404 responses
      try {
        // Extract hash from URL if available for validation
        const hashMatch = url.match(
          /\/([a-fA-F0-9]{64})(?:\.[a-zA-Z0-9]+)?(?:\/|$)/
        )
        const extractedHash = hashMatch ? hashMatch[1] : ''

        if (extractedHash) {
          const isValidContent = await quickValidateUrl(url)
          if (!isValidContent) {
            console.warn(
              `[Download] URL ${i + 1} failed content validation (likely fake 404), trying next URL if available`
            )
            lastError = new Error(
              `Content validation failed: likely fake 404 response from ${url}`
            )
            continue
          }
        }
      } catch (validationError) {
        console.warn(
          `[Download] Content validation error for URL ${i + 1}:`,
          validationError
        )
        // Continue anyway - validation error doesn't necessarily mean the file is invalid
      }

      // Get the blob with the correct MIME type
      const blob = await response.blob()

      // Create a new blob with the correct MIME type to ensure proper file extension
      const correctedBlob = new Blob([blob], { type: mimeType })

      // Create object URL
      const blobUrl = URL.createObjectURL(correctedBlob)

      // Create a temporary anchor element
      const a = document.createElement('a')

      // Set the href attribute to the blob URL
      a.href = blobUrl

      // Set the download attribute with the desired file name
      a.download = filename

      // Append the anchor to the body (not displayed)
      document.body.appendChild(a)

      // Programmatically trigger a click event on the anchor to start the download
      a.click()

      // Clean up: remove the anchor and revoke the object URL
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      return // Success, exit the function
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Unknown error occurred')

      // If this is the last URL, try the fallback method
      if (i === urls.length - 1) {
        console.log(
          '[Download] All blob downloads failed, trying fallback method with last URL'
        )

        try {
          // Fallback to the original anchor-based method with the last URL
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          a.setAttribute('target', '_blank')
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)

          return // Success with fallback method
        } catch (fallbackError) {
          console.error(
            '[Download] ✗ Fallback method also failed:',
            fallbackError
          )
          lastError =
            fallbackError instanceof Error
              ? fallbackError
              : new Error('Fallback method failed')
        }
      }
    }
  }

  // If we get here, all URLs failed
  throw lastError || new Error('All download URLs failed')
}

/**
 * Downloads a file from the given URL using a blob-based approach to preserve file extension.
 *
 * @param url - The URL of the file to download.
 * @param filename - The name of the file to save as.
 */
export const downloadFile = async (url: string, filename: string) => {
  // Use the new downloadFileWithFallback function with a single URL
  await downloadFileWithFallback([url], filename)
}

/**
 * Checks if the url endpoint returns a file
 * @param url
 * @returns true if matches a possible file download
 */
export const checkUrlForFile = async (url: string) => {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    // HTTP HEAD request to get headers without downloading the full content
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    // Check Content-Disposition header
    const contentDisposition = response.headers.get('content-disposition')
    if (contentDisposition && contentDisposition.includes('attachment')) {
      return true
    }

    //Check Content-Type header
    const contentType = response.headers.get('content-type')
    if (
      contentType &&
      (contentType.includes('application/') ||
        contentType.includes('image/') ||
        contentType.includes('audio/') ||
        contentType.includes('video/'))
    ) {
      return true
    }
  } catch {
    // Ignore
  }

  // Check if blossom file (link includes sha256 string in the url)
  // Most likely it's a file that users would directly download
  const regex = /\/[a-fA-F0-9]{64}(\.[a-zA-Z0-9]+)?$/
  if (regex.test(url)) {
    return true
  }

  // Common mod file extensions
  const fileExtensions = [
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.bz2',
    '.xz',
    '.cab',
    '.iso', // (can also be considered a disk image)
    '.tgz', // (tar.gz)
    '.z', // (compress)
    '.lz', // (Lempel-Ziv)
    '.mp3',
    '.wav',
    '.aac',
    '.flac',
    '.ogg',
    '.wma',
    '.m4a',
    '.opus',
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.mpeg',
    '.3gp',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.tiff',
    '.tif',
    '.svg',
    '.raw',
    '.heic',
    '.exe', // (executable files for Windows games)
    '.apk', // (Android Package)
    '.ipa', // (iOS App Store Package)
    '.bin', // (binary file, often used for game data)
    '.iso', // (disk image, often for console games)
    '.sav', // (save game file)
    '.cfg', // (configuration file)
    '.mod', // (modification file)
    '.pak', // (package file, often used in games)
    '.unity', // (Unity game project file)
    '.game', // (generic game file)
    '.dmg' // (disk image for macOS applications)
  ]

  for (const ext of fileExtensions) {
    if (url.endsWith(ext)) {
      return true
    }
  }

  return false
}
