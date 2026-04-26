import { useState, useEffect, useCallback } from 'react'
import { Blossom } from './useBlossomList'
import { findAllDownloadUrls } from '../utils/blossomHashSearch'
import { extractHashFromUrl } from '../utils/hashBlocking'
import { log, LogType } from '../utils'
import {
  loadImageWithBlossomSupport,
  cleanupBlobUrl
} from '../utils/imageLoader'

interface UseImageFallbackOptions {
  originalUrl: string
  personalBlossomList?: Blossom[]
  defaultBlossomList?: Blossom[]
  commenterBlossomList?: Blossom[]
  enabled?: boolean // Allow disabling the fallback search
  prioritizeOriginal?: boolean // If true, prioritizes the original URL even if hash doesn't match (for mod posts)
}

interface UseImageFallbackResult {
  currentUrl: string
  isSearching: boolean
  hasAlternatives: boolean
  error?: string
  allUrls: string[]
  hash?: string
  retryWithFallback: () => void
  isBlobUrl?: boolean
  loadImageWithBlobSupport: (url: string) => Promise<string>
}

/**
 * Hook for handling image fallback across blossom servers
 * Extracts hash from URL and searches for alternatives when needed
 */
export const useImageFallback = ({
  originalUrl,
  personalBlossomList = [],
  defaultBlossomList = [],
  commenterBlossomList = [],
  enabled = true,
  prioritizeOriginal = false
}: UseImageFallbackOptions): UseImageFallbackResult => {
  const [currentUrl, setCurrentUrl] = useState(originalUrl)
  // Start isSearching as true if the URL has a hash and fallback is enabled.
  // This prevents consumers (ImageWithFallback) from using the original URL
  // before the hash search has had a chance to find alternatives.
  const [isSearching, setIsSearching] = useState(() => {
    return enabled && !!extractHashFromUrl(originalUrl)
  })
  const [hasAlternatives, setHasAlternatives] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [allUrls, setAllUrls] = useState<string[]>([originalUrl])
  const [hash, setHash] = useState<string | undefined>()
  const [hasSearched, setHasSearched] = useState(false)
  const [isBlobUrl, setIsBlobUrl] = useState(false)

  // Extract hash from URL on mount
  useEffect(() => {
    const extractedHash = extractHashFromUrl(originalUrl)
    setHash(extractedHash || undefined)

    console.log(
      `[ImageFallback] Hash extraction: url=${originalUrl}, hash=${extractedHash || 'NONE'}`
    )
  }, [originalUrl])

  // Search for alternative URLs when hash is available
  const searchForAlternatives = useCallback(async () => {
    console.log(
      `[ImageFallback] searchForAlternatives called: enabled=${enabled}, hash=${hash}, hasSearched=${hasSearched}`
    )
    if (!enabled || !hash || hasSearched) {
      console.log(`[ImageFallback] Search skipped (condition not met)`)
      return
    }

    setIsSearching(true)
    setError(undefined)
    setHasSearched(true)

    try {
      log(
        false,
        LogType.Info,
        `[ImageFallback] Searching for alternatives for hash: ${hash}`
      )

      const foundUrls = await findAllDownloadUrls(
        hash,
        originalUrl,
        personalBlossomList,
        defaultBlossomList,
        commenterBlossomList,
        prioritizeOriginal
      )

      setAllUrls(foundUrls)

      if (foundUrls.length > 1) {
        setHasAlternatives(true)
        // Use the first URL (best alternative or original if no alternatives found)
        setCurrentUrl(foundUrls[0])
        log(
          false,
          LogType.Info,
          `[ImageFallback] Found ${foundUrls.length} alternative URLs`
        )
      } else {
        log(
          false,
          LogType.Info,
          `[ImageFallback] No alternatives found, using original URL`
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      log(
        true,
        LogType.Error,
        `[ImageFallback] Error searching for alternatives: ${errorMessage}`
      )
    } finally {
      setIsSearching(false)
    }
  }, [
    enabled,
    hash,
    hasSearched,
    originalUrl,
    personalBlossomList,
    defaultBlossomList,
    commenterBlossomList,
    prioritizeOriginal
  ])

  // Function to load image with blob support for blossom servers
  const loadImageWithBlobSupport = useCallback(
    async (url: string): Promise<string> => {
      try {
        const result = await loadImageWithBlossomSupport(url)
        if (result.success) {
          setIsBlobUrl(result.isBlobUrl || false)
          return result.url
        } else {
          throw new Error(result.error || 'Failed to load image')
        }
      } catch (err) {
        log(
          true,
          LogType.Error,
          `[ImageFallback] Blob loading failed for ${url}:`,
          err
        )
        throw err
      }
    },
    []
  )

  // Manual retry function
  const retryWithFallback = useCallback(() => {
    if (!hash) {
      log(
        false,
        LogType.Info,
        `[ImageFallback] No hash available for fallback retry`
      )
      return
    }

    setHasSearched(false)
    setError(undefined)
    searchForAlternatives()
  }, [hash, searchForAlternatives])

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (isBlobUrl && currentUrl.startsWith('blob:')) {
        cleanupBlobUrl(currentUrl)
      }
    }
  }, [currentUrl, isBlobUrl])

  // Auto-search on image load error (when hash is available)
  useEffect(() => {
    if (hash && enabled && !hasSearched) {
      // Small delay to avoid immediate search on mount
      const timer = setTimeout(() => {
        searchForAlternatives()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [hash, enabled, hasSearched, searchForAlternatives])

  return {
    currentUrl,
    isSearching,
    hasAlternatives,
    error,
    allUrls,
    hash,
    retryWithFallback,
    isBlobUrl,
    loadImageWithBlobSupport
  }
}
