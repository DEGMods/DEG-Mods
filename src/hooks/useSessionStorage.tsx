import React, { useMemo } from 'react'
import {
  getSessionStorageItem,
  mergeWithInitialValue,
  removeSessionStorageItem,
  setSessionStorageItem
} from 'utils'

const useSessionStorageSubscribe = (callback: () => void) => {
  window.addEventListener('sessionStorage', callback)
  return () => window.removeEventListener('sessionStorage', callback)
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const getSnapshot = () => {
    // Get the stored value
    const storedValue = getSessionStorageItem(key, initialValue)

    // Parse the value
    const parsedStoredValue = JSON.parse(storedValue)

    // Merge the default and the stored in case some of the required fields are missing
    return JSON.stringify(
      mergeWithInitialValue(parsedStoredValue, initialValue)
    )
  }

  const data = React.useSyncExternalStore(
    useSessionStorageSubscribe,
    getSnapshot
  )

  const setState: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (v: React.SetStateAction<T>) => {
      try {
        const nextState =
          typeof v === 'function'
            ? (v as (prevState: T) => T)(JSON.parse(data))
            : v

        if (nextState === undefined || nextState === null) {
          removeSessionStorageItem(key)
        } else {
          setSessionStorageItem(key, JSON.stringify(nextState))
        }
      } catch (e) {
        console.warn(e)
      }
    },
    [data, key]
  )

  React.useEffect(() => {
    // Set session storage only when it's empty
    const data = window.sessionStorage.getItem(key)
    if (data === null) {
      setSessionStorageItem(key, JSON.stringify(initialValue))
    }
  }, [key, initialValue])

  const memoized = useMemo(() => JSON.parse(data) as T, [data])

  return [memoized, setState]
}
