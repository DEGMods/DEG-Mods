import React, { useState, useEffect, useRef } from 'react'
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
 */
function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const dotIndex = pathname.lastIndexOf('.')
    if (dotIndex !== -1) {
      return pathname.slice(dotIndex)
    }
  } catch {
    const match = url.match(/(\.\w+)(?:\?|$)/)
    if (match) return match[1]
  }
  return ''
}

/**
 * Compute SHA256 hash of an ArrayBuffer using Web Crypto API.
 */
async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

type ImageState = 'loading' | 'verified' | 'unverified' | 'tampered'

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
 * Image component with hash verification and automatic fallback chain.
 *
 * For any URL containing a SHA256 hash:
 *   1. Fetches from each server in the chain
 *   2. Computes SHA256 of the downloaded bytes
 *   3. Compares to the hash in the URL
 *   4. Only displays the image if the hash matches
 *   5. If a server serves tampered content (hash mismatch), it's rejected
 *   6. If ALL servers fail → shows integrity warning
 *
 * For non-hash URLs: loads directly via <img>, no verification.
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
  const hash = enableFallback ? extractHashFromUrl(src) : null
  const extension = getExtensionFromUrl(src)

  const urlChain = hash
    ? buildFallbackChain(hash, extension, src)
    : null

  const [state, setState] = useState<ImageState>(urlChain ? 'loading' : 'unverified')
  const [verifiedUrl, setVerifiedUrl] = useState<string | null>(null)
  const [verifiedFrom, setVerifiedFrom] = useState<string | null>(null)
  const [showTampered, setShowTampered] = useState(false)
  const mountedRef = useRef(true)

  // Track mount state
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Hash verification chain
  useEffect(() => {
    if (!urlChain || !hash) return

    let cancelled = false
    let tamperedFound = false

    // Reset state for new src
    setState('loading')
    setVerifiedUrl(null)
    setVerifiedFrom(null)

    const verifyChain = async () => {
      for (const url of urlChain) {
        if (cancelled) return

        try {
          const response = await fetch(url)
          if (!response.ok) {
            console.log(`[ImageVerify] ${url} → ${response.status}`)
            continue
          }

          const buffer = await response.arrayBuffer()
          if (cancelled || !mountedRef.current) return

          const computedHash = await computeSha256(buffer)

          if (computedHash === hash) {
            // Hash matches — use this server's URL directly
            // Browser cache will serve the img load from cache
            if (!cancelled && mountedRef.current) {
              setVerifiedUrl(url)
              setVerifiedFrom(url !== src ? url : null)
              setState('verified')
              console.log(`[ImageVerify] ✓ Verified: ${url}`)
            }
            return
          } else {
            // Hash mismatch — this server is serving tampered content
            tamperedFound = true
            console.warn(
              `[ImageVerify] ✗ TAMPERED: ${url}\n` +
              `  Expected: ${hash}\n` +
              `  Got:      ${computedHash}`
            )
          }
        } catch (err) {
          // CORS, network error, etc — can't verify from this server
          console.log(`[ImageVerify] Fetch error: ${url}`, err instanceof Error ? err.message : err)
          continue
        }
      }

      // All servers exhausted
      if (cancelled || !mountedRef.current) return

      if (tamperedFound) {
        // At least one server returned content with wrong hash
        setState('tampered')
        console.warn(`[ImageVerify] ⚠ All servers failed verification for hash: ${hash}`)
      } else {
        // All servers unreachable (CORS/network/404) — fall back to unverified display
        setState('unverified')
        console.log(`[ImageVerify] All servers unreachable for ${hash}, showing unverified`)
      }
    }

    verifyChain()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  // ── Loading state ──
  if (state === 'loading') {
    return (
      <div className="image-with-fallback-container IBMSMSCWSPicWrapper">
        <div
          className={`image-with-fallback image-fallback-loading-state ${className}`}
          style={style}
        >
          <div className="image-fallback-spinner-large"></div>
        </div>
      </div>
    )
  }

  // ── Tampered state — image shown with a small warning bar at the bottom ──
  if (state === 'tampered') {
    return (
      <div className="image-with-fallback-container IBMSMSCWSPicWrapper">
        <img
          src={src}
          alt={alt}
          className={`image-with-fallback ${className}`}
          style={style}
          onClick={onClick}
          onError={onError}
        />
        {!showTampered && (
          <div className="image-tampered-bar">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 512 512"
              width="14"
              height="14"
              fill="currentColor"
            >
              <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
            </svg>
            <span>Image failed integrity check</span>
            <button
              className="image-tampered-bar-close"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setShowTampered(true)
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Verified or Unverified — show image ──
  const displayUrl = verifiedUrl || src

  return (
    <div className="image-with-fallback-container IBMSMSCWSPicWrapper">
      <img
        src={displayUrl}
        alt={alt}
        className={`image-with-fallback ${className}`}
        style={style}
        onClick={onClick}
        onError={onError}
      />

      {/* Verified badge */}
      {state === 'verified' && (
        <div
          className="image-verified-badge"
          title={verifiedFrom
            ? `Verified from ${new URL(verifiedFrom).hostname}`
            : 'Hash verified'
          }
        >
          <span>✓</span>
        </div>
      )}
    </div>
  )
}
