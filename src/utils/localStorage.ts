export function getLocalStorageItem<T>(key: string, defaultValue: T): string {
  try {
    const data = window.localStorage.getItem(key)
    if (data === null) return JSON.stringify(defaultValue)
    return data
  } catch (err) {
    console.error(`Error while fetching local storage value: `, err)
    return JSON.stringify(defaultValue)
  }
}

export function setLocalStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
    dispatchLocalStorageEvent(key, value)
  } catch (err) {
    console.error(`Error while saving local storage value: `, err)
  }
}

export function removeLocalStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key)
    dispatchLocalStorageEvent(key, null)
  } catch (err) {
    console.error(`Error while deleting local storage value: `, err)
  }
}

function dispatchLocalStorageEvent(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
}
