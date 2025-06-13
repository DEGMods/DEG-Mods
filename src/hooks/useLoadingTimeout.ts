import { useEffect, useState } from 'react'

/**
 * Hook that returns true if loading is true and timeout hasn't been reached
 * @param loading - The loading state to monitor
 * @param timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns boolean indicating if we should still block rendering
 */
export const useLoadingTimeout = (
  loading: boolean,
  timeoutMs: number = 1000
): boolean => {
  const [shouldBlock, setShouldBlock] = useState(true)

  useEffect(() => {
    if (!loading) {
      setShouldBlock(false)
      return
    }

    setShouldBlock(true)
    const timer = setTimeout(() => {
      setShouldBlock(false)
    }, timeoutMs)

    return () => clearTimeout(timer)
  }, [loading, timeoutMs])

  return shouldBlock
}
