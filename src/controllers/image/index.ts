import { DropzoneOptions } from 'react-dropzone'
import { NostrCheckServer } from './nostrcheck-server'
import { BaseError } from 'types'
import { BlossomBandServer } from './blossomband-server'
import { DegmodsServer } from './degmods-server'
import { AxiosResponse } from 'axios'

export interface MediaOperations {
  post: (file: File) => Promise<string>
}
export type MediaStrategy = Omit<MediaOperations, 'auth'> & {
  auth?: (hash: string, cachedSignedEvent?: string) => Promise<string>
  scan?: (hash: string) => Promise<string>
  uploadMirrors?: (hash: string, mirrors: string[]) => Promise<string>
  mirror?: (url: string, hash: string, signal?: AbortSignal) => Promise<string>
  head?: (hash: string, signal?: AbortSignal) => Promise<string>
  retryWithQueueToken?: (
    url: string,
    auth: string,
    file: File,
    queueToken: string
  ) => Promise<string>
  getResponse?: (
    url: string,
    auth: string,
    file: File
  ) => Promise<AxiosResponse>
  getMediaUrl?: () => string
  getMirrorUrl?: () => string
  getHeadUrl?: (hash: string) => string
}

export interface MediaOption {
  name: string
  host: string
  type:
    | 'nostrcheck-server'
    | 'blossomband-server'
    | 'route96'
    | 'degmods-server'
}

// File size constants (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE_10MB: 10 * 1024 * 1024, // 10MB for images
  ZIP_500MB: 500 * 1024 * 1024, // 500MB for zip files
  DEFAULT: 10 * 1024 * 1024 // Default 10MB
} as const

// nostr.build based dropzone options
export const MEDIA_DROPZONE_OPTIONS: DropzoneOptions = {
  maxSize: FILE_SIZE_LIMITS.DEFAULT,
  accept: {
    'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp']
  }
}

export const MEDIA_OPTIONS: MediaOption[] = [
  {
    name: 'bs.degmods.com',
    host: 'https://bs.degmods.com/',
    type: 'degmods-server'
  },
  {
    name: 'blossom.band',
    host: 'https://blossom.band/',
    type: 'blossomband-server'
  },
  {
    name: 'nostrcheck.me',
    host: 'https://nostrcheck.me/',
    type: 'nostrcheck-server'
  },
  {
    name: 'nostpic.com',
    host: 'https://nostpic.com/',
    type: 'nostrcheck-server'
  }
  // {
  //   name: 'void.cat',
  //   host: 'https://void.cat/',
  //   type: 'route96'
  // }
]

// if url is localhost, use degmods-server
if (window.location.hostname === 'localhost') {
  MEDIA_OPTIONS.unshift({
    name: 'localhost',
    host: 'http://localhost:3000/',
    type: 'degmods-server'
  })
}

enum ImageErrorType {
  'TYPE_MISSING' = 'Media Option must include a type.'
}

export class ImageController implements MediaStrategy {
  post: (file: File) => Promise<string>
  auth?: (hash: string, cachedSignedEvent?: string) => Promise<string>
  scan?: (hash: string) => Promise<string>
  uploadMirrors?: (hash: string, mirrors: string[]) => Promise<string>
  mirror?: (url: string, hash: string, signal?: AbortSignal) => Promise<string>
  head?: (hash: string, signal?: AbortSignal) => Promise<string>
  retryWithQueueToken?: (
    url: string,
    auth: string,
    file: File,
    queueToken: string
  ) => Promise<string>
  getResponse?: (
    url: string,
    auth: string,
    file: File
  ) => Promise<AxiosResponse>
  getMediaUrl?: () => string
  getMirrorUrl?: () => string
  getHeadUrl?: (hash: string) => string

  constructor(mediaOption: MediaOption) {
    let strategy: MediaStrategy
    switch (mediaOption.type) {
      case 'nostrcheck-server':
        strategy = new NostrCheckServer(mediaOption.host)
        this.post = strategy.post
        this.mirror = strategy.mirror
        this.head = strategy.head
        break

      case 'blossomband-server':
        strategy = new BlossomBandServer(mediaOption.host)
        this.post = strategy.post
        this.mirror = strategy.mirror
        this.head = strategy.head
        break

      case 'degmods-server':
        strategy = new DegmodsServer(mediaOption.host)
        this.post = strategy.post
        this.auth = strategy.auth
        this.scan = strategy.scan
        this.mirror = strategy.mirror
        this.head = strategy.head
        this.uploadMirrors = strategy.uploadMirrors
        this.retryWithQueueToken = strategy.retryWithQueueToken
        this.getResponse = strategy.getResponse
        this.getMediaUrl = strategy.getMediaUrl
        this.getMirrorUrl = strategy.getMirrorUrl
        this.getHeadUrl = strategy.getHeadUrl
        break

      case 'route96':
        throw new Error('Not implemented.')

      default:
        throw new BaseError(ImageErrorType.TYPE_MISSING)
    }
  }
}
