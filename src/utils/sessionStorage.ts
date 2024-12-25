export function getSessionStorageItem<T>(key: string, defaultValue: T): string {
  try {
    const data = window.sessionStorage.getItem(key)
    if (data === null) return JSON.stringify(defaultValue)
    return data
  } catch (err) {
    console.error(`Error while fetching session storage value: `, err)
    return JSON.stringify(defaultValue)
  }
}

export function setSessionStorageItem(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value)
    dispatchSessionStorageEvent(key, value)
  } catch (err) {
    console.error(`Error while saving session storage value: `, err)
  }
}

export function removeSessionStorageItem(key: string) {
  try {
    window.sessionStorage.removeItem(key)
    dispatchSessionStorageEvent(key, null)
  } catch (err) {
    console.error(`Error while deleting session storage value: `, err)
  }
}

function dispatchSessionStorageEvent(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('sessionStorage', { key, newValue }))
}
