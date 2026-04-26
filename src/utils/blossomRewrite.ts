import { extractHashFromUrl } from './hashBlocking'

/**
 * Ordered list of blossom servers to try (first wins).
 * bs.degmods.com should be last to offload traffic.
 */
const MIRROR_SERVERS = [
  'https://blossom.band',
  'https://blossom.primal.net',
]

/**
 * Rewrite a bs.degmods.com URL to use the first mirror server instead.
 * Non-degmods URLs are returned unchanged.
 * 
 * e.g. "https://bs.degmods.com/abc123.jpg" → "https://blossom.band/abc123.jpg"
 */
export function rewriteBlossomUrl(url: string): string {
  if (!url || !url.includes('bs.degmods.com')) return url

  const hash = extractHashFromUrl(url)
  if (!hash) return url

  // Extract extension from original URL
  try {
    const pathname = new URL(url).pathname
    const dotIndex = pathname.lastIndexOf('.')
    const ext = dotIndex !== -1 ? pathname.slice(dotIndex) : ''
    return `${MIRROR_SERVERS[0]}/${hash}${ext}`
  } catch {
    return url
  }
}

/**
 * Build a CSS background url() string using a mirror server.
 * 
 * e.g. rewriteBlossomBg("https://bs.degmods.com/abc.jpg", "center / cover no-repeat")
 *      → "url(https://blossom.band/abc.jpg) center / cover no-repeat"
 */
export function rewriteBlossomBg(url: string, cssProps: string = 'center / cover no-repeat'): string {
  const rewritten = rewriteBlossomUrl(url)
  return `url(${rewritten}) ${cssProps}`
}
