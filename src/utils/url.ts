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
  // Create a URL object to parse the provided URL string
  const urlObj = new URL(url)

  // Extract the pathname from the URL object
  const pathname = urlObj.pathname

  // Extract the filename from the pathname. The filename is the last segment after the last '/'
  // If pathname is empty or does not end with a filename, use 'downloaded_file' as the default
  const filename =
    pathname.substring(pathname.lastIndexOf('/') + 1) || 'downloaded_file'

  // Return the extracted filename
  return filename
}

/**
 * Downloads a file from the given URL.
 *
 * @param url - The URL of the file to download.
 * @param filename - The name of the file to save as.
 */
export const downloadFile = (url: string, filename: string) => {
  // Create a temporary anchor element
  const a = document.createElement('a')

  // Set the href attribute to the file's URL
  a.href = url

  // Set the download attribute with the desired file name
  a.download = filename

  // Set target="_blank" to ensure that link opens in new tab
  a.setAttribute('target', '_blank')

  // Append the anchor to the body (not displayed)
  document.body.appendChild(a)

  // Programmatically trigger a click event on the anchor to start the download
  a.click()

  // Remove the anchor from the document
  document.body.removeChild(a)
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
