import { useCallback, useEffect, useState } from 'react'
import { setLocalStorageItem, removeLocalStorageItem } from 'utils'

export function useLocalCache<T>(
  key: string
): [
  T | undefined,
  React.Dispatch<React.SetStateAction<T | undefined>>,
  () => void
] {
  const [cache, setCache] = useState<T | undefined>(() => {
    const storedValue = window.localStorage.getItem(key)
    if (storedValue === null) return undefined

    // Parse the value
    const parsedStoredValue = JSON.parse(storedValue)
    return parsedStoredValue
  })

  useEffect(() => {
    try {
      if (cache) {
        setLocalStorageItem(key, JSON.stringify(cache))
      } else {
        removeLocalStorageItem(key)
      }
    } catch (e) {
      console.warn(e)
    }
  }, [cache, key])

  const clearCache = useCallback(() => {
    setCache(undefined)
  }, [])

  return [cache, setCache, clearCache]
}
