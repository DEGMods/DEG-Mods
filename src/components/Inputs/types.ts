export type MirrorStatus = 'loading' | 'success' | 'error' | 'scanned'

export type MirrorError = {
  message: string
  timestamp: number
}
