import axios, { isAxiosError } from 'axios'
import { NostrEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { type MediaOperations } from '.'
import { store } from 'store'
import { log, LogType, now } from 'utils'
import { BaseError, handleError } from 'types'

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
  #url: string

  constructor(url: string) {
    this.#url = url[url.length - 1] === '/' ? url : `${url}/`
  }

  getMediaUrl = () => {
    return `${this.#url}${this.#media}`
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

  post = async (file: File) => {
    const url = this.getMediaUrl()
    const auth = await this.auth(file)
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
  getUnsignedEvent = async (url: string, hexPubkey: string, _file: File) => {
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

  auth = async (file: File) => {
    const url = this.getMediaUrl()

    let hexPubkey: string | undefined
    const userState = store.getState().user
    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
    } else {
      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      throw new BaseError(HandledErrorType.PUBKEY)
    }

    const unsignedEvent = await this.getUnsignedEvent(url, hexPubkey, file)
    try {
      const signedEvent = await window.nostr?.signEvent(unsignedEvent)
      return btoa(JSON.stringify(signedEvent))
    } catch (error) {
      if (error instanceof BaseError) {
        throw error
      }

      throw new BaseError(HandledErrorType.SIGN, {
        cause: handleError(error)
      })
    }
  }
}
