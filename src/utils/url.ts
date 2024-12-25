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
