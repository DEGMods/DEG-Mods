import axios, { isAxiosError } from 'axios'
import { NostrEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { type MediaOperations } from '.'
import { store } from 'store'
import { getFileSha256, log, LogType, now } from 'utils'
import { BaseError, handleError } from 'types'

// Helper function to detect and log nostr extension details
const logNostrExtensionDetails = () => {
  if (!window.nostr) {
    console.log(`[NostrExtensionDetector] No nostr extension found`)
    return
  }
}

// https://github.com/quentintaranpino/nostrcheck-server/blob/main/DOCS.md#media-post
// Response object (other fields omitted for brevity)
// {
//     "status": "success",
//     "nip94_event": {
//         "tags": [
//             [
//                 "url",
//                 "https://nostrcheck.me/media/62c76eb094369d938f5895442eef7f53ebbf019f69707d64e77d4d182b609309/c35277dbcedebb0e3b80361762c8baadb66dcdfb6396949e50630159a472c3b2.webp"
//             ],
//         ],
//     }
// }

export interface Response {
  status: 'success' | string
  nip94_event?: {
    tags?: string[][]
  }
}

enum HandledErrorType {
  'PUBKEY' = 'Failed to get public key.',
  'SIGN' = 'Failed to sign the event.',
  'AXIOS_REQ' = 'Image upload failed. Try another host from the dropdown.',
  'AXIOS_RES' = 'Image upload failed. Reason: ',
  'AXIOS_ERR' = 'Image upload failed.',
  'NOSTR_CHECK_NO_SUCCESS' = 'Image upload was unsuccesfull.',
  'NOSTR_CHECK_BAD_EVENT' = 'Image upload failed. Please try again.'
}

export class NostrCheckServer implements MediaOperations {
  #media = 'api/v2/media'
  #mirror = 'api/v2/mirror'
  #head = 'api/v2/media'
  #url: string

  constructor(url: string) {
    this.#url = url[url.length - 1] === '/' ? url : `${url}/`
  }

  getMediaUrl = () => {
    return `${this.#url}${this.#media}`
  }

  getMirrorUrl = () => {
    return `${this.#url}${this.#mirror}`
  }

  getHeadUrl = (hash: string) => {
    return `${this.#url}${this.#head}/${hash}`
  }

  getResponse = async (url: string, auth: string, file: File) => {
    const response = await axios.postForm<Response>(
      url,
      {
        uploadType: 'media',
        file: file
      },
      {
        headers: {
          Authorization: 'Nostr ' + auth,
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'json'
      }
    )

    return response
  }

  mirror = async (url: string, hash: string, signal?: AbortSignal) => {
    const mirrorStartTime = performance.now()
    const mirrorUrl = this.getMirrorUrl()

    console.log(`[NostrCheckServer] Starting mirror process`)
    console.log(`[NostrCheckServer] Source URL: ${url}`)
    console.log(`[NostrCheckServer] File hash: ${hash}`)
    console.log(`[NostrCheckServer] Mirror URL: ${mirrorUrl}`)
    console.log(`[NostrCheckServer] Abort signal provided:`, !!signal)

    console.log(`[NostrCheckServer] Getting authentication for mirror...`)
    const authStartTime = performance.now()

    let auth: string
    try {
      auth = await this.auth(hash)
      const authEndTime = performance.now()
      console.log(
        `[NostrCheckServer] Authentication completed (took ${authEndTime - authStartTime}ms)`
      )
    } catch (error) {
      const authEndTime = performance.now()
      console.error(
        `[NostrCheckServer] Authentication failed (took ${authEndTime - authStartTime}ms):`,
        error
      )
      throw error
    }

    console.log(`[NostrCheckServer] Making mirror request...`)
    const requestStartTime = performance.now()
    const requestPayload = { url }
    const requestHeaders = {
      Authorization: 'Nostr ' + auth,
      'Content-Type': 'application/json'
    }

    console.log(`[NostrCheckServer] Request payload:`, requestPayload)
    console.log(`[NostrCheckServer] Request headers:`, {
      ...requestHeaders,
      Authorization: `Nostr ${auth.substring(0, 20)}...` // Truncate auth for logging
    })

    // Log the full request configuration that will be sent
    const fullRequestConfig = {
      method: 'PUT',
      url: mirrorUrl,
      headers: requestHeaders,
      data: requestPayload,
      responseType: 'json',
      signal: !!signal
    }
    console.log(`[NostrCheckServer] Full request configuration:`, {
      ...fullRequestConfig,
      headers: {
        ...fullRequestConfig.headers,
        Authorization: `Nostr ${auth.substring(0, 20)}...` // Truncate auth for logging
      }
    })

    // Log the exact request body as string
    console.log(
      `[NostrCheckServer] Request body as JSON string:`,
      JSON.stringify(requestPayload)
    )
    console.log(
      `[NostrCheckServer] Request body size:`,
      JSON.stringify(requestPayload).length,
      'bytes'
    )

    try {
      // Create a custom axios instance for this request to add interceptors
      const axiosInstance = axios.create()

      // Add request interceptor to log the exact request being sent
      axiosInstance.interceptors.request.use(
        (config) => {
          console.log(
            `[NostrCheckServer] Axios request interceptor - Final request config:`,
            {
              method: config.method?.toUpperCase(),
              url: config.url,
              baseURL: config.baseURL,
              headers: {
                ...config.headers,
                Authorization: config.headers?.Authorization
                  ? `Nostr ${config.headers.Authorization.toString().substring(6, 26)}...`
                  : undefined
              },
              data: config.data,
              params: config.params,
              timeout: config.timeout,
              responseType: config.responseType
            }
          )

          // Log the raw request data
          if (config.data) {
            console.log(`[NostrCheckServer] Raw request data:`, config.data)
            console.log(
              `[NostrCheckServer] Request data type:`,
              typeof config.data
            )
            if (typeof config.data === 'string') {
              console.log(
                `[NostrCheckServer] Request data as string:`,
                config.data
              )
            } else {
              console.log(
                `[NostrCheckServer] Request data serialized:`,
                JSON.stringify(config.data)
              )
            }
          }

          return config
        },
        (error) => {
          console.error(`[NostrCheckServer] Request interceptor error:`, error)
          return Promise.reject(error)
        }
      )

      // Add response interceptor to log the response
      axiosInstance.interceptors.response.use(
        (response) => {
          console.log(
            `[NostrCheckServer] Axios response interceptor - Response received:`,
            {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data
            }
          )
          return response
        },
        (error) => {
          console.error(`[NostrCheckServer] Response interceptor error:`, {
            message: error.message,
            code: error.code,
            response: error.response
              ? {
                  status: error.response.status,
                  statusText: error.response.statusText,
                  headers: error.response.headers,
                  data: error.response.data
                }
              : undefined
          })
          return Promise.reject(error)
        }
      )

      const response = await axiosInstance.put<Response>(
        mirrorUrl,
        requestPayload,
        {
          headers: requestHeaders,
          responseType: 'json',
          signal, // Add the abort signal to the axios request
          // Add request interceptor logging
          onUploadProgress: (progressEvent) => {
            console.log(`[NostrCheckServer] Upload progress:`, {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0
            })
          }
        }
      )

      const requestEndTime = performance.now()
      const mirrorEndTime = performance.now()

      console.log(
        `[NostrCheckServer] Mirror request completed (took ${requestEndTime - requestStartTime}ms)`
      )
      console.log(`[NostrCheckServer] Response status: ${response.status}`)
      console.log(`[NostrCheckServer] Response headers:`, response.headers)
      console.log(`[NostrCheckServer] Response data:`, response.data)
      console.log(
        `[NostrCheckServer] Total mirror process took ${mirrorEndTime - mirrorStartTime}ms`
      )

      const result = response.status === 200 ? 'success' : 'error'
      console.log(`[NostrCheckServer] Mirror result: ${result}`)

      return result
    } catch (error) {
      const requestEndTime = performance.now()
      const mirrorEndTime = performance.now()

      console.error(
        `[NostrCheckServer] Mirror request failed (took ${requestEndTime - requestStartTime}ms)`
      )
      console.error(
        `[NostrCheckServer] Total mirror process failed after ${mirrorEndTime - mirrorStartTime}ms`
      )
      console.error(`[NostrCheckServer] Mirror error details:`, error)

      if (isAxiosError(error)) {
        console.error(`[NostrCheckServer] Axios error details:`, {
          code: error.code,
          name: error.name,
          message: error.message,
          hasResponse: !!error.response,
          hasRequest: !!error.request,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          requestConfig: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
              ? {
                  ...error.config.headers,
                  Authorization: error.config.headers.Authorization
                    ? `Nostr ${error.config.headers.Authorization.toString().substring(6, 26)}...`
                    : undefined
                }
              : undefined
          }
        })

        if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
          throw new Error('Request timed out')
        } else if (error.response) {
          // Server responded with error status
          const status = error.response.status
          const message =
            error.response.data?.message ||
            error.response.data?.description ||
            `Server error: ${status}`
          console.error(
            `[NostrCheckServer] Server error response: ${status} - ${message}`
          )
          throw new Error(message)
        } else if (error.request) {
          // Request was made but no response received
          console.error(`[NostrCheckServer] No response received from server`)
          console.error(`[NostrCheckServer] Request details:`, {
            readyState: error.request.readyState,
            status: error.request.status,
            statusText: error.request.statusText,
            responseURL: error.request.responseURL
          })
          throw new Error('No response from server')
        } else {
          // Something else happened
          console.error(`[NostrCheckServer] Network error occurred`)
          throw new Error('Network error')
        }
      } else {
        console.error(
          `[NostrCheckServer] Unknown error type:`,
          typeof error,
          error
        )
        throw new Error('Unknown error occurred')
      }
    }
  }

  head = async (hash: string, signal?: AbortSignal) => {
    const headUrl = this.getHeadUrl(hash)
    const auth = await this.auth(hash)
    try {
      const response = await axios.head(headUrl, {
        headers: {
          Authorization: 'Nostr ' + auth,
          'Content-Type': 'application/json'
        },
        signal // Add the abort signal to the axios request
      })

      return response.status === 200 ? 'success' : 'error'
    } catch (error) {
      console.debug('head error', error)

      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
          throw new Error('Request timed out')
        } else if (error.response) {
          // Server responded with error status
          const status = error.response.status
          const message =
            error.response.data?.message ||
            error.response.data?.description ||
            `Server error: ${status}`
          throw new Error(message)
        } else if (error.request) {
          // Request was made but no response received
          throw new Error('No response from server')
        } else {
          // Something else happened
          throw new Error('Network error')
        }
      } else {
        throw new Error('Unknown error occurred')
      }
    }
  }

  post = async (file: File) => {
    const url = this.getMediaUrl()
    const sha256 = await getFileSha256(file)
    const auth = await this.auth(sha256)
    try {
      const response = await this.getResponse(url, auth, file)

      if (response.data.status !== 'success') {
        throw new BaseError(HandledErrorType.NOSTR_CHECK_NO_SUCCESS, {
          context: { ...response.data }
        })
      }

      if (
        response.data &&
        response.data.nip94_event &&
        response.data.nip94_event.tags &&
        response.data.nip94_event.tags.length
      ) {
        // Return first 'url' tag we find on the returned nip94 event
        const imageUrl = response.data.nip94_event.tags.find(
          (item) => item[0] === 'url'
        )

        if (imageUrl) return imageUrl[1]
      }

      throw new BaseError(HandledErrorType.NOSTR_CHECK_BAD_EVENT, {
        context: { ...response.data }
      })
    } catch (error) {
      // Handle axios errors
      if (isAxiosError(error)) {
        if (error.request) {
          // The request was made but no response was received
          throw new BaseError(HandledErrorType.AXIOS_REQ, {
            cause: error
          })
        } else if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          // nostrcheck-server can return different results, including message or description
          const data = error.response.data
          let message = error.message
          if (data) {
            message = data?.message || data?.description || error.message
          }
          throw new BaseError(HandledErrorType.AXIOS_RES + message, {
            cause: error
          })
        } else {
          // Something happened in setting up the request that triggered an Error
          throw new BaseError(HandledErrorType.AXIOS_ERR, {
            cause: error
          })
        }
      } else if (error instanceof BaseError) {
        throw error
      } else {
        throw handleError(error)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUnsignedEvent = async (url: string, hexPubkey: string, _hash: string) => {
    const unsignedEvent: NostrEvent = {
      content: '',
      created_at: now(),
      kind: NDKKind.HttpAuth,
      pubkey: hexPubkey,
      tags: [
        ['u', url],
        ['method', 'POST']
      ]
    }

    return unsignedEvent
  }

  auth = async (hash: string) => {
    const authStartTime = performance.now()
    const url = this.getMediaUrl()

    console.log(`[NostrCheckServer] Starting auth process for hash: ${hash}`)
    console.log(`[NostrCheckServer] Media URL: ${url}`)
    console.log(`[NostrCheckServer] Nostr extension available:`, !!window.nostr)

    // Log detailed extension information
    logNostrExtensionDetails()

    let hexPubkey: string | undefined
    const userState = store.getState().user
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
      console.log(
        `[NostrCheckServer] Using cached pubkey from user state: ${hexPubkey}`
      )
    } else {
      console.log(
        `[NostrCheckServer] Requesting pubkey from nostr extension...`
      )
      const pubkeyStartTime = performance.now()

      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
        const pubkeyEndTime = performance.now()
        console.log(
          `[NostrCheckServer] Got pubkey from extension: ${hexPubkey} (took ${pubkeyEndTime - pubkeyStartTime}ms)`
        )
      } catch (error) {
        const pubkeyEndTime = performance.now()
        console.error(
          `[NostrCheckServer] Failed to get pubkey from extension (took ${pubkeyEndTime - pubkeyStartTime}ms):`,
          error
        )
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      console.error(`[NostrCheckServer] No pubkey available, throwing error`)
      throw new BaseError(HandledErrorType.PUBKEY)
    }

    console.log(`[NostrCheckServer] Creating unsigned event...`)
    const unsignedEvent = await this.getUnsignedEvent(url, hexPubkey, hash)
    console.log(`[NostrCheckServer] Unsigned event created:`, {
      kind: unsignedEvent.kind,
      pubkey: unsignedEvent.pubkey,
      created_at: unsignedEvent.created_at,
      tags: unsignedEvent.tags,
      content: unsignedEvent.content
    })

    console.log(
      `[NostrCheckServer] Requesting signature from nostr extension...`
    )
    const signStartTime = performance.now()

    try {
      const signedEvent = await window.nostr?.signEvent(unsignedEvent)
      const signEndTime = performance.now()
      const authEndTime = performance.now()

      console.log(
        `[NostrCheckServer] Event signed successfully (took ${signEndTime - signStartTime}ms)`
      )
      console.log(
        `[NostrCheckServer] Total auth process took ${authEndTime - authStartTime}ms`
      )

      const authHeader = btoa(JSON.stringify(signedEvent))
      console.log(
        `[NostrCheckServer] Auth header created (length: ${authHeader.length})`
      )

      // Log the full auth header structure (but not the actual signature for security)
      try {
        const decodedAuth = JSON.parse(atob(authHeader))
        console.log(`[NostrCheckServer] Auth header structure:`, {
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
          `[NostrCheckServer] Failed to parse auth header for logging:`,
          parseError
        )
      }

      return authHeader
    } catch (error) {
      const signEndTime = performance.now()
      const authEndTime = performance.now()

      console.error(
        `[NostrCheckServer] Failed to sign event (took ${signEndTime - signStartTime}ms):`,
        error
      )
      console.error(
        `[NostrCheckServer] Total auth process failed after ${authEndTime - authStartTime}ms`
      )

      if (error instanceof BaseError) {
        throw error
      }

      throw new BaseError(HandledErrorType.SIGN, {
        cause: handleError(error)
      })
    }
  }
}
