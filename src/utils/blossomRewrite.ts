import { extractHashFromUrl } from './hashBlocking'

/**
 * Preferred mirror server for blossom hash URLs.
 * Used as the primary source when rewriting any blossom hash URL.
 */
const PREFERRED_MIRROR = 'https://blossom.band'

/**
 * Rewrite any blossom hash URL to use the preferred mirror server.
 * Works for ANY domain — if the URL contains a SHA256 hash in the path,
 * it gets rewritten to the preferred mirror.
 *
 * e.g. "https://bs.degmods.com/abc123.jpg" → "https://blossom.band/abc123.jpg"
 * e.g. "https://some-blossom.com/abc123.png" → "https://blossom.band/abc123.png"
 * 
 * Non-hash URLs (e.g. regular image hosts) are returned unchanged.
 */
export function rewriteBlossomUrl(url: string): string {
  if (!url) return url

  const hash = extractHashFromUrl(url)
  if (!hash) return url

  // Extract extension from original URL
  try {
    const pathname = new URL(url).pathname
    const dotIndex = pathname.lastIndexOf('.')
    const ext = dotIndex !== -1 ? pathname.slice(dotIndex) : ''
    return `${PREFERRED_MIRROR}/${hash}${ext}`
  } catch {
    return url
  }
}
