import React, { useMemo } from 'react'
import {
  getLocalStorageItem,
  mergeWithInitialValue,
  removeLocalStorageItem,
  setLocalStorageItem
} from 'utils'

const useLocalStorageSubscribe = (callback: () => void) => {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const getSnapshot = () => {
    // Get the stored value
    const storedValue = getLocalStorageItem(key, initialValue)

    // Parse the value
    const parsedStoredValue = JSON.parse(storedValue)

    // Merge the default and the stored in case some of the required fields are missing
    return JSON.stringify(
      mergeWithInitialValue(parsedStoredValue, initialValue)
    )
  }

  const data = React.useSyncExternalStore(useLocalStorageSubscribe, getSnapshot)

  const setState: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (v: React.SetStateAction<T>) => {
      try {
        const nextState =
          typeof v === 'function'
            ? (v as (prevState: T) => T)(JSON.parse(data))
            : v

        if (nextState === undefined || nextState === null) {
          removeLocalStorageItem(key)
        } else {
          setLocalStorageItem(key, JSON.stringify(nextState))
        }
      } catch (e) {
        console.warn(e)
      }
    },
    [data, key]
  )

  React.useEffect(() => {
    // Set local storage only when it's empty
    const data = window.localStorage.getItem(key)
    if (data === null) {
      setLocalStorageItem(key, JSON.stringify(initialValue))
    }
  }, [key, initialValue])

  const memoized = useMemo(() => JSON.parse(data) as T, [data])

  return [memoized, setState]
}
