import axios from 'axios'
import { NostrCheckServer, Response } from './nostrcheck-server'
import { NostrEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { getFileSha256, now, log, LogType } from 'utils'
import { BaseError, handleError } from 'types'
import { store } from 'store'

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

  getResponse = async (url: string, auth: string, file: File) => {
    console.log(`[DegmodsUpload] getResponse called — url: ${url}, file: ${file.name} (${file.size} bytes, type: ${file.type})`)

    // Read file into memory first
    console.log(`[DegmodsUpload] Reading file into ArrayBuffer...`)
    const t0 = performance.now()
    const fileBuffer = await file.arrayBuffer()
    console.log(`[DegmodsUpload] ArrayBuffer read: ${fileBuffer.byteLength} bytes in ${(performance.now() - t0).toFixed(0)}ms`)

    console.log(`[DegmodsUpload] Computing SHA256...`)
    const t1 = performance.now()
    const sha256 = await getFileSha256(file)
    console.log(`[DegmodsUpload] SHA256: ${sha256} in ${(performance.now() - t1).toFixed(0)}ms`)

    const blob = new Blob([fileBuffer], { type: file.type })
    console.log(`[DegmodsUpload] Created Blob: ${blob.size} bytes, type: ${blob.type}`)
    console.log(`[DegmodsUpload] Sending fetch PUT to ${url}...`)
    const t2 = performance.now()

    const fetchResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: 'Nostr ' + auth,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Sha256': sha256
      },
      body: blob
    })

    console.log(`[DegmodsUpload] Fetch completed: status=${fetchResponse.status} in ${(performance.now() - t2).toFixed(0)}ms`)

    if (fetchResponse.ok) {
      const data = await fetchResponse.json()
      // Build a response compatible with the NostrCheckServer.post() expectations
      const response = {
        data: {
          status: 'success' as const,
          nip94_event: {
            tags: [['url', data.url]]
          },
          url: data.url
        },
        status: fetchResponse.status
      }
      return response as unknown as import('axios').AxiosResponse<Response>
    }

    // Handle error responses — replicate the axios error handling
    const status = fetchResponse.status
    const responseText = await fetchResponse.text().catch(() => '')
    const xReason = fetchResponse.headers.get('x-reason')

    switch (status) {
      case 412: {
        // Precondition Failed - Queue scenario
        console.log(
          `[FileUpload] Queue response:`,
          responseText,
          xReason
        )
        const queueData: DegmodsQueueResponse = JSON.parse(xReason || '{}')
        console.log(`[FileUpload] Queue data:`, queueData)

        if (!queueData.value || typeof queueData.value !== 'string') {
          console.warn(
            'Invalid queue response: missing or invalid token',
            queueData
          )
          throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_FULL, {
            context: {
              queueToken: null,
              position: queueData.position,
              rawResponse: responseText,
              auth
            }
          })
        }

        throw new BaseError(DegmodsErrorType.UPLOAD_QUEUE_FULL, {
          context: {
            queueToken: queueData.value,
            position: queueData.position,
            header: queueData.header,
            auth
          }
        })
      }

      case 400: {
        if (responseText?.includes('sha256')) {
          throw new BaseError(DegmodsErrorType.AUTH_MISSING_SHA256)
        } else if (responseText?.includes('file type')) {
          throw new BaseError(DegmodsErrorType.INVALID_FILE_TYPE)
        } else {
          const errorMessage = xReason || responseText || 'Unknown error'
          throw new BaseError('Bad request: ' + errorMessage)
        }
      }

      case 401: {
        throw new BaseError(
          'Upload unauthorized: ' +
            (responseText || 'Authentication failed')
        )
      }

      case 413: {
        throw new BaseError(DegmodsErrorType.FILE_TOO_LARGE)
      }

      case 507: {
        throw new BaseError(DegmodsErrorType.SERVER_OUT_OF_SPACE)
      }

      case 404: {
        if (responseText?.includes('disabled')) {
          throw new BaseError(DegmodsErrorType.UPLOAD_DISABLED)
        }
        throw new BaseError('Upload endpoint not found')
      }

      default: {
        throw new BaseError(
          `Upload failed: ${status} - ${responseText || 'Unknown error'}`
        )
      }
    }
  }

  // New method to retry upload with queue token
  retryWithQueueToken = async (
    url: string,
    auth: string,
    file: File,
    queueToken: string
  ) => {
    const fileBuffer = await file.arrayBuffer()
    const sha256 = await getFileSha256(file)

    const fetchResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: 'Nostr ' + auth,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Sha256': sha256,
        'X-Upload-Queue-Token': queueToken
      },
      body: new Blob([fileBuffer], { type: file.type })
    })

    if (fetchResponse.ok) {
      const data = await fetchResponse.json()
      return data.url as string
    }

    const status = fetchResponse.status
    const responseText = await fetchResponse.text().catch(() => '')
    const xReason = fetchResponse.headers.get('x-reason')

    switch (status) {
      case 412: {
        // Still in queue, update position
        const queueData: DegmodsQueueResponse = JSON.parse(xReason || '{}')

        if (!queueData.value || typeof queueData.value !== 'string') {
          console.warn(
            'Invalid retry queue response: missing or invalid token',
            queueData
          )
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

      case 400: {
        if (responseText?.includes('sha256')) {
          throw new BaseError(DegmodsErrorType.AUTH_MISSING_SHA256)
        } else if (responseText?.includes('file type')) {
          throw new BaseError(DegmodsErrorType.INVALID_FILE_TYPE)
        } else {
          const errorMessage = xReason || responseText || 'Unknown error'
          throw new BaseError('Bad request: ' + errorMessage)
        }
      }

      case 401: {
        throw new BaseError(
          'Upload unauthorized: ' +
            (responseText || 'Authentication failed')
        )
      }

      case 413: {
        throw new BaseError(DegmodsErrorType.FILE_TOO_LARGE)
      }

      case 507: {
        throw new BaseError(DegmodsErrorType.SERVER_OUT_OF_SPACE)
      }

      case 404: {
        if (responseText?.includes('disabled')) {
          throw new BaseError(DegmodsErrorType.UPLOAD_DISABLED)
        }
        throw new BaseError('Upload endpoint not found')
      }

      default: {
        throw new BaseError(
          `Upload failed: ${status} - ${responseText || 'Unknown error'}`
        )
      }
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
