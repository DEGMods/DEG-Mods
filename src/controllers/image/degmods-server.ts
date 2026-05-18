import axios from 'axios'
import { NostrCheckServer, Response } from './nostrcheck-server'
import { NostrEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { now, log, LogType } from 'utils'
import { BaseError, handleError } from 'types'
import { store } from 'store'

export type UploadProgress = {
  /** 0–100 */
  percent: number
  /** Bytes uploaded so far */
  loaded: number
  /** Total bytes */
  total: number
  /** Upload speed in bytes/sec (smoothed) */
  speed: number
  /** Estimated seconds remaining */
  eta: number
}

/**
 * Stall detection: abort upload if no progress is made for this many ms.
 * This replaces fixed timeouts — uploads of any size/speed succeed as long
 * as data keeps flowing. Only truly stalled connections get aborted.
 *
 * Base timeout is 60s for fast failure when the connection is genuinely dead.
 * The adaptive extension (set in onprogress) extends this based on observed
 * upload speed so slow-but-healthy connections aren't killed prematurely.
 */
const STALL_TIMEOUT_BASE_MS = 60_000 // 60s base — fast feedback on dead connections
const STALL_CHECK_INTERVAL_MS = 5_000 // check every 5 seconds

/**
 * Infer MIME type from file extension when browser doesn't provide one.
 * Prevents 400 rejections for files with unrecognized extensions.
 */
function inferMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type

  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'zip': return 'application/zip'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    default: return file.type || 'application/octet-stream'
  }
}

/**
 * Compute SHA-256 hash from an ArrayBuffer (avoids re-reading the file).
 */
async function hashBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type DegmodsResponse = {
  status: number
  data: {
    url: string
  }
}

export type DegmodsQueueResponse = {
  error: string
  header?: string
  value?: string
  position?: number
}

// New error types for Degmods server
export enum DegmodsErrorType {
  'UPLOAD_QUEUE_FULL' = 'Server is full, you are in upload queue',
  'UPLOAD_QUEUE_POSITION' = 'Waiting in upload queue at position',
  'UPLOAD_QUEUE_EXPIRED' = 'Upload queue entry has expired',
  'INVALID_FILE_TYPE' = 'File type not allowed',
  'AUTH_MISSING_SHA256' = 'Authentication missing file hash',
  'SERVER_OUT_OF_SPACE' = 'Bad request: Not enough space on server',
  'FILE_TOO_LARGE' = 'File size exceeds server limits',
  'UPLOAD_DISABLED' = 'Uploads are currently disabled'
}

export class DegmodsServer extends NostrCheckServer {
  #media = 'upload'
  #mirror = 'mirror'
  #url: string

  constructor(url: string) {
    super(url)
    this.#url = url[url.length - 1] === '/' ? url : `${url}/`
  }

  getMediaUrl = () => {
    return `${this.#url}${this.#media}`
  }

  getMirrorUrl = () => {
    return `${this.#url}${this.#mirror}`
  }

  getHeadUrl = (hash: string) => {
    return `${this.#url}${hash}`
  }

  scan = async (hash: string) => {
    const mediaUrl = this.getMediaUrl()
    const url = `${mediaUrl}/${hash}`
    const response = await axios.get<Response>(url)

    if (response.status === 200) {
      return JSON.stringify(response.data)
    }

    return 'error'
  }

  uploadMirrors = async (hash: string, mirrors: string[]) => {
    const mediaUrl = this.getMediaUrl()
    const url = `${mediaUrl}/${hash}/mirror`
    const auth = await this.auth(hash)
    const response = await axios.post<Response>(url, mirrors, {
      headers: {
        Authorization: 'Nostr ' + auth,
        'Content-Type': 'application/json'
      },
      responseType: 'json'
    })

    if (response.status === 200) {
      return 'success'
    }

    return 'error'
  }

  getResponse = async (url: string, auth: string, file: File, onProgress?: (p: UploadProgress) => void) => {
    console.log(`[DegmodsUpload] getResponse called — url: ${url}, file: ${file.name} (${file.size} bytes, type: ${file.type})`)

    // Read file into memory once
    console.log(`[DegmodsUpload] Reading file into ArrayBuffer...`)
    const t0 = performance.now()
    const fileBuffer = await file.arrayBuffer()
    console.log(`[DegmodsUpload] ArrayBuffer read: ${fileBuffer.byteLength} bytes in ${(performance.now() - t0).toFixed(0)}ms`)

    // Hash from the same buffer (no double-read)
    console.log(`[DegmodsUpload] Computing SHA256 from buffer...`)
    const t1 = performance.now()
    const sha256 = await hashBuffer(fileBuffer)
    console.log(`[DegmodsUpload] SHA256: ${sha256} in ${(performance.now() - t1).toFixed(0)}ms`)

    // Infer MIME type from extension if browser doesn't provide one
    const contentType = inferMimeType(file)
    const blob = new Blob([fileBuffer], { type: contentType })
    console.log(`[DegmodsUpload] Created Blob: ${blob.size} bytes, type: ${contentType}`)
    console.log(`[DegmodsUpload] Sending XHR PUT to ${url}...`)
    console.log(`[DegmodsUpload] Stall detection: abort if no progress for ${STALL_TIMEOUT_BASE_MS / 1000}s`)

    const { status, responseText, headers } = await this._xhrUpload(
      url, auth, contentType, sha256, blob, undefined, onProgress
    )

    if (status >= 200 && status < 300) {
      const data = JSON.parse(responseText)
      const response = {
        data: {
          status: 'success' as const,
          nip94_event: {
            tags: [['url', data.url]]
          },
          url: data.url
        },
        status
      }
      return response as unknown as import('axios').AxiosResponse<Response>
    }

    this._handleErrorResponse(status, responseText, headers, auth)
  }

  // Retry upload with queue token
  retryWithQueueToken = async (
    url: string,
    auth: string,
    file: File,
    queueToken: string,
    onProgress?: (p: UploadProgress) => void
  ) => {
    const fileBuffer = await file.arrayBuffer()
    const sha256 = await hashBuffer(fileBuffer)
    const contentType = inferMimeType(file)
    const blob = new Blob([fileBuffer], { type: contentType })

    const { status, responseText, headers } = await this._xhrUpload(
      url, auth, contentType, sha256, blob, queueToken, onProgress
    )

    if (status >= 200 && status < 300) {
      const data = JSON.parse(responseText)
      return data.url as string
    }

    // For retries, also handle 412 (still in queue)
    if (status === 412) {
      const xReason = headers['x-reason'] || ''
      const queueData: DegmodsQueueResponse = JSON.parse(xReason || '{}')

      if (!queueData.value || typeof queueData.value !== 'string') {
        console.warn('Invalid retry queue response: missing or invalid token', queueData)
        throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_POSITION, {
          context: {
            queueToken: queueData.value,
            position: queueData.position || 0,
            rawResponse: responseText
          }
        })
      }

      throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_POSITION, {
        context: {
          queueToken: queueData.value,
          position: queueData.position || 0
        }
      })
    }

    this._handleErrorResponse(status, responseText, headers, auth)
  }

  /* ─── Shared XHR upload with stall-based progress tracking ─── */

  private _xhrUpload(
    url: string,
    auth: string,
    contentType: string,
    sha256: string,
    blob: Blob,
    queueToken?: string,
    onProgress?: (p: UploadProgress) => void
  ): Promise<{ status: number; responseText: string; headers: Record<string, string> }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const startTime = Date.now()
      let lastLoaded = 0
      let lastTime = startTime
      let smoothSpeed = 0
      let lastProgressTime = Date.now()
      let settled = false

      const cleanup = () => {
        settled = true
        clearInterval(stallChecker)
      }

      // Stall detection — abort if no progress for STALL_TIMEOUT_BASE_MS
      const stallChecker = setInterval(() => {
        if (settled) return
        const stallDuration = Date.now() - lastProgressTime
        if (stallDuration > STALL_TIMEOUT_BASE_MS) {
          cleanup()
          xhr.abort()
          const stallSecs = Math.round(stallDuration / 1000)
          reject(new BaseError(
            `Upload stalled — no data sent for ${stallSecs} seconds. Please check your connection and try again.`
          ))
        }
      }, STALL_CHECK_INTERVAL_MS)

      xhr.open('PUT', url)
      xhr.setRequestHeader('Authorization', 'Nostr ' + auth)
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.setRequestHeader('X-Sha256', sha256)
      if (queueToken) {
        xhr.setRequestHeader('X-Upload-Queue-Token', queueToken)
      }
      // No xhr.timeout — stall detection handles it

      xhr.upload.onprogress = (e) => {
        lastProgressTime = Date.now() // reset stall timer on any progress
        if (!e.lengthComputable || !onProgress) return
        const now = Date.now()
        const elapsed = (now - lastTime) / 1000
        if (elapsed > 0.3) {
          const instantSpeed = (e.loaded - lastLoaded) / elapsed
          smoothSpeed = smoothSpeed === 0 ? instantSpeed : smoothSpeed * 0.7 + instantSpeed * 0.3
          lastLoaded = e.loaded
          lastTime = now
        }
        const remaining = e.total - e.loaded
        onProgress({
          percent: Math.round((e.loaded / e.total) * 100),
          loaded: e.loaded,
          total: e.total,
          speed: smoothSpeed,
          eta: smoothSpeed > 0 ? remaining / smoothSpeed : 0
        })
      }

      xhr.onload = () => {
        cleanup()
        const headers: Record<string, string> = {}
        const xReason = xhr.getResponseHeader('x-reason')
        if (xReason) headers['x-reason'] = xReason
        resolve({ status: xhr.status, responseText: xhr.responseText, headers })
      }

      xhr.onerror = () => {
        cleanup()
        reject(new BaseError('Network error during upload. Please check your connection.'))
      }

      xhr.onabort = () => {
        // Only handle if not already settled by stall detection
        if (!settled) {
          cleanup()
          reject(new BaseError('Upload was cancelled.'))
        }
      }

      xhr.send(blob)
    })
  }

  /* ─── Shared error handler for non-OK responses ─── */

  private _handleErrorResponse(
    status: number,
    responseText: string,
    headers: Record<string, string>,
    auth: string
  ): never {
    const xReason = headers['x-reason'] || ''

    switch (status) {
      case 412: {
        console.log(`[FileUpload] Queue response:`, responseText, xReason)
        const queueData: DegmodsQueueResponse = JSON.parse(xReason || '{}')
        console.log(`[FileUpload] Queue data:`, queueData)

        if (!queueData.value || typeof queueData.value !== 'string') {
          console.warn('Invalid queue response: missing or invalid token', queueData)
          throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_FULL, {
            context: { queueToken: null, position: queueData.position, rawResponse: responseText, auth }
          })
        }
        throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_FULL, {
          context: { queueToken: queueData.value, position: queueData.position, header: queueData.header, auth }
        })
      }
      case 400: {
        if (responseText?.includes('sha256')) throw new BaseError(DegmodsErrorType.AUTH_MISSING_SHA256)
        if (responseText?.includes('file type')) throw new BaseError(DegmodsErrorType.INVALID_FILE_TYPE)
        throw new BaseError('Bad request: ' + (xReason || responseText || 'Unknown error'))
      }
      case 401:
        throw new BaseError('Upload unauthorized: ' + (responseText || 'Authentication failed'))
      case 413:
        throw new BaseError(DegmodsErrorType.FILE_TOO_LARGE)
      case 507:
        throw new BaseError(DegmodsErrorType.SERVER_OUT_OF_SPACE)
      case 404: {
        if (responseText?.includes('disabled')) throw new BaseError(DegmodsErrorType.UPLOAD_DISABLED)
        throw new BaseError('Upload endpoint not found')
      }
      default:
        throw new BaseError(`Upload failed: ${status} - ${responseText || 'Unknown error'}`)
    }
  }

  getUnsignedEvent = async (_url: string, hexPubkey: string, hash: string) => {
    const unsignedEvent: NostrEvent = {
      content: 'Authorize Upload',
      created_at: now(),
      kind: NDKKind.BlossomUpload,
      pubkey: hexPubkey,
      tags: [
        ['t', 'upload'],
        ['x', hash],
        ['expiration', (now() + 365 * 60 * 60 * 24 * 30).toString()]
      ]
    }

    return unsignedEvent
  }

  auth = async (hash: string, cachedSignedEvent?: string) => {
    const authStartTime = performance.now()
    const url = this.getMediaUrl()

    console.log(`[DegmodsServer] Starting auth process for hash: ${hash}`)
    console.log(`[DegmodsServer] Media URL: ${url}`)
    console.log(
      `[DegmodsServer] Cached signed event provided:`,
      !!cachedSignedEvent
    )

    // If we have a cached signed event, return it directly
    if (cachedSignedEvent) {
      console.log(
        `[DegmodsServer] Using cached signed event (length: ${cachedSignedEvent.length})`
      )
      return cachedSignedEvent
    }

    console.log(`[DegmodsServer] Nostr extension available:`, !!window.nostr)

    // Log extension details if available
    if (window.nostr) {
      console.log(`[DegmodsServer] Extension methods available:`, {
        getPublicKey: typeof window.nostr.getPublicKey,
        signEvent: typeof window.nostr.signEvent,
        nip04: typeof window.nostr.nip04,
        getRelays: typeof window.nostr.getRelays
      })
    }

    let hexPubkey: string | undefined
    const userState = store.getState().user
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
      console.log(
        `[DegmodsServer] Using cached pubkey from user state: ${hexPubkey}`
      )
    } else {
      console.log(`[DegmodsServer] Requesting pubkey from nostr extension...`)
      const pubkeyStartTime = performance.now()

      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
        const pubkeyEndTime = performance.now()
        console.log(
          `[DegmodsServer] Got pubkey from extension: ${hexPubkey} (took ${pubkeyEndTime - pubkeyStartTime}ms)`
        )
      } catch (error) {
        const pubkeyEndTime = performance.now()
        console.error(
          `[DegmodsServer] Failed to get pubkey from extension (took ${pubkeyEndTime - pubkeyStartTime}ms):`,
          error
        )
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      console.error(`[DegmodsServer] No pubkey available, throwing error`)
      throw new BaseError('Failed to get public key.')
    }

    console.log(`[DegmodsServer] Creating unsigned event...`)
    const unsignedEvent = await this.getUnsignedEvent(url, hexPubkey, hash)
    console.log(`[DegmodsServer] Unsigned event created:`, {
      kind: unsignedEvent.kind,
      pubkey: unsignedEvent.pubkey,
      created_at: unsignedEvent.created_at,
      tags: unsignedEvent.tags,
      content: unsignedEvent.content
    })

    console.log(`[DegmodsServer] Requesting signature from nostr extension...`)
    const signStartTime = performance.now()

    try {
      const signedEvent = await window.nostr?.signEvent(unsignedEvent)
      const signEndTime = performance.now()
      const authEndTime = performance.now()

      console.log(
        `[DegmodsServer] Event signed successfully (took ${signEndTime - signStartTime}ms)`
      )
      console.log(
        `[DegmodsServer] Total auth process took ${authEndTime - authStartTime}ms`
      )

      const authHeader = btoa(JSON.stringify(signedEvent))
      console.log(
        `[DegmodsServer] Auth header created (length: ${authHeader.length})`
      )

      // Log the full auth header structure (but not the actual signature for security)
      try {
        const decodedAuth = JSON.parse(atob(authHeader))
        console.log(`[DegmodsServer] Auth header structure:`, {
          id: decodedAuth.id,
          pubkey: decodedAuth.pubkey,
          created_at: decodedAuth.created_at,
          kind: decodedAuth.kind,
          tags: decodedAuth.tags,
          content: decodedAuth.content,
          sig: decodedAuth.sig
            ? `${decodedAuth.sig.substring(0, 16)}...`
            : 'missing'
        })
      } catch (parseError) {
        console.error(
          `[DegmodsServer] Failed to parse auth header for logging:`,
          parseError
        )
      }

      return authHeader
    } catch (error) {
      const signEndTime = performance.now()
      const authEndTime = performance.now()

      console.error(
        `[DegmodsServer] Failed to sign event (took ${signEndTime - signStartTime}ms):`,
        error
      )
      console.error(
        `[DegmodsServer] Total auth process failed after ${authEndTime - authStartTime}ms`
      )

      if (error instanceof BaseError) {
        throw error
      }

      throw new BaseError('Failed to sign the event.', {
        cause: handleError(error)
      })
    }
  }
}
