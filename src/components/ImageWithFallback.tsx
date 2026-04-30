import React, { useState, useCallback, useRef } from 'react'
import { extractHashFromUrl } from '../utils/hashBlocking'
import '../styles/imageWithFallback.css'

/**
 * Ordered list of blossom servers to try.
 * bs.degmods.com is last — we want to offload traffic from it.
 */
const FALLBACK_SERVERS = [
  'https://blossom.band',
  'https://blossom.primal.net',
  'https://bs.degmods.com',
]

/**
 * Build a fallback chain of URLs for a given hash + extension.
 * Includes the original URL at the end if it's not already in the chain.
 */
function buildFallbackChain(hash: string, extension: string, originalUrl: string): string[] {
  const chain = FALLBACK_SERVERS.map(server => `${server}/${hash}${extension}`)

  // Add original URL at the end if it's not already covered by a mirror
  const originalInChain = chain.some(url => {
    try {
      return new URL(url).href === new URL(originalUrl).href
    } catch {
      return url === originalUrl
    }
  })
  if (!originalInChain) {
    chain.push(originalUrl)
  }

  return chain
}

/**
 * Extract the file extension from a URL path.
 * e.g. "https://bs.degmods.com/abc123.jpg" → ".jpg"
 */
function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const dotIndex = pathname.lastIndexOf('.')
    if (dotIndex !== -1) {
      return pathname.slice(dotIndex)
    }
  } catch {
    // fallback: try regex
    const match = url.match(/(\.\w+)(?:\?|$)/)
    if (match) return match[1]
  }
  return ''
}

interface ImageWithFallbackProps {
  src: string
  alt?: string
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
  showVerificationIcon?: boolean
  enableFallback?: boolean
  // Keep these in the interface for compatibility, but they're no longer used
  personalBlossomList?: any[]
  defaultBlossomList?: any[]
  commenterBlossomList?: any[]
  prioritizeOriginal?: boolean
}

/**
 * Image component with automatic fallback chain.
 *
 * For any URL containing a SHA256 hash (blossom hash URLs):
 *   1. Tries blossom.band first
 *   2. On error → tries blossom.primal.net
 *   3. On error → tries bs.degmods.com
 *   4. On error → falls back to the original URL (if different)
 *
 * For non-hash URLs: loads directly, no fallback.
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  className = '',
  style,
  onClick,
  onError,
  enableFallback = true,
}) => {
  // Extract hash and build fallback chain
  const hash = extractHashFromUrl(src)
  const extension = getExtensionFromUrl(src)

  // Build the URL chain: for any hash URL, try mirrors first.
  // For non-hash URLs, just use the original.
  const urlChain = (enableFallback && hash)
    ? buildFallbackChain(hash, extension, src)
    : [src]

  // Track which URL in the chain we're currently trying
  const [urlIndex, setUrlIndex] = useState(0)
  const [loadedFromMirror, setLoadedFromMirror] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Current URL to display
  const currentUrl = urlChain[Math.min(urlIndex, urlChain.length - 1)]

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const nextIndex = urlIndex + 1

      if (nextIndex < urlChain.length) {
        // Try next server in the chain
        console.log(
          `[ImageFallback] Failed: ${urlChain[urlIndex]} → trying: ${urlChain[nextIndex]}`
        )
        setUrlIndex(nextIndex)
      } else {
        // All servers failed
        console.log(`[ImageFallback] All servers failed for hash: ${hash}`)
        if (onError) onError(e)
      }
    },
    [urlIndex, urlChain, hash, onError]
  )

  const handleLoad = useCallback(() => {
    // Check if we loaded from a different server than the original
    if (hash && currentUrl !== src) {
      setLoadedFromMirror(true)
    }
  }, [hash, currentUrl, src])

  return (
    <div className="image-with-fallback-container IBMSMSCWSPicWrapper">
      <img
        ref={imgRef}
        src={currentUrl}
        alt={alt}
        className={`image-with-fallback ${className}`}
        style={style}
        onClick={onClick}
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* Mirror indicator */}
      {loadedFromMirror && (
        <div
          className="image-fallback-success"
          title={`Loaded from ${new URL(currentUrl).hostname}`}
        >
          <span>✓</span>
        </div>
      )}
    </div>
  )
}
