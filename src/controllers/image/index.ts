import { DropzoneOptions } from 'react-dropzone'
import { NostrCheckServer } from './nostrcheck-server'
import { BaseError } from 'types'

export interface MediaOperations {
  post: (file: File) => Promise<string>
}
export type MediaStrategy = Omit<MediaOperations, 'auth'>

export interface MediaOption {
  name: string
  host: string
  type: 'nostrcheck-server' | 'route96'
}

// nostr.build based dropzone options
export const MEDIA_DROPZONE_OPTIONS: DropzoneOptions = {
  maxSize: 7000000,
  accept: {
    'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp']
  }
}

export const MEDIA_OPTIONS: MediaOption[] = [
  // {
  //   name: 'nostr.build',
  //   host: 'https://nostr.build/',
  //   type: 'nostrcheck-server'
  // },
  {
    name: 'nostrcheck.me',
    host: 'https://nostrcheck.me/',
    type: 'nostrcheck-server'
  },
  {
    name: 'nostpic.com',
    host: 'https://nostpic.com/',
    type: 'nostrcheck-server'
  },
  {
    name: 'files.sovbit.host',
    host: 'https://files.sovbit.host/',
    type: 'nostrcheck-server'
  }
  // {
  //   name: 'void.cat',
  //   host: 'https://void.cat/',
  //   type: 'route96'
  // }
]

enum ImageErrorType {
  'TYPE_MISSING' = 'Media Option must include a type.'
}

export class ImageController implements MediaStrategy {
  post: (file: File) => Promise<string>

  constructor(mediaOption: MediaOption) {
    let strategy: MediaStrategy
    switch (mediaOption.type) {
      case 'nostrcheck-server':
        strategy = new NostrCheckServer(mediaOption.host)
        this.post = strategy.post
        break

      case 'route96':
        throw new Error('Not implemented.')

      default:
        throw new BaseError(ImageErrorType.TYPE_MISSING)
    }
  }
}
