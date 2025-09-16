import axios from 'axios'
import { NostrCheckServer, Response } from './nostrcheck-server'
import { NostrEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { now } from 'utils'

export type BlossomBandResponse = {
  status: number
  data: {
    nip94: string[][]
  }
}

export class BlossomBandServer extends NostrCheckServer {
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

  getResponse = async (url: string, auth: string, file: File) => {
    const response = await axios.put<Response>(url, file, {
      headers: {
        Authorization: 'Nostr ' + auth,
        'Content-Type': file.type
      },
      responseType: 'json'
    })

    response.data.status = response.status === 200 ? 'success' : 'error'
    response.data.nip94_event = {
      tags: (response as unknown as BlossomBandResponse).data.nip94
    }

    return response
  }

  getUnsignedEvent = async (_url: string, hexPubkey: string, hash: string) => {
    const unsignedEvent: NostrEvent = {
      content: '',
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
}
