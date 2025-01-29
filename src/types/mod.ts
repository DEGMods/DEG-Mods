import { NDKEvent } from '@nostr-dev-kit/ndk'
import { BlogDetails } from 'types'

export enum CommentEventStatus {
  Publishing = 'Publishing comment...',
  Published = 'Published!',
  Failed = 'Failed to publish comment.'
}

export interface CommentEvent {
  event: NDKEvent
  status?: CommentEventStatus
}

export type Game = {
  'Game Name': string
  '16 by 9 image': string
  'Boxart image': string
}

export interface ModFormState {
  dTag: string
  aTag: string
  rTag: string
  game: string
  title: string
  body: string
  featuredImageUrl: string
  summary: string
  nsfw: boolean
  repost: boolean
  originalAuthor?: string
  screenshotsUrls: string[]
  tags: string
  /** Hierarchical labels */
  LTags: string[]
  /** Category labels for category search */
  lTags: string[]
  downloadUrls: DownloadUrl[]
  published_at: number

  // Permissions and details
  otherAssets?: boolean
  uploadPermission?: boolean
  modPermission?: boolean
  convPermission?: boolean
  assetUsePermission?: boolean
  assetUseComPermission?: boolean
  publisherNotes?: string
  extraCredits?: string
}

// Permissions
export type ModPermissions = Pick<
  ModFormState,
  | 'otherAssets'
  | 'uploadPermission'
  | 'modPermission'
  | 'convPermission'
  | 'assetUsePermission'
  | 'assetUseComPermission'
>

export interface DownloadUrl {
  url: string
  title?: string
  hash: string
  signatureKey: string
  malwareScanLink: string
  modVersion: string
  customNote: string
  mediaUrl?: string
}

export interface ModDetails extends Omit<ModFormState, 'tags'> {
  id: string
  edited_at: number
  author: string
  tags: string[]
}

export interface MuteLists {
  authors: string[]
  replaceableEvents: string[]
}

export interface ModPageLoaderResult {
  mod: ModDetails | undefined
  event: NDKEvent | undefined
  latest: Partial<BlogDetails>[]
  isAddedToNSFW: boolean
  isBlocked: boolean
  isRepost: boolean
  postWarning?: 'user' | 'admin'
}

export type SubmitModActionResult =
  | { type: 'validation'; error: FormErrors }
  | {
      type: 'timeout'
      data: {
        dTag: string
        aTag: string
        published_at: number
      }
    }

export interface FormErrors {
  game?: string
  title?: string
  body?: string
  featuredImageUrl?: string
  summary?: string
  nsfw?: string
  screenshotsUrls?: string[]
  tags?: string
  downloadUrls?: string[]
  author?: string
  originalAuthor?: string
}

type ModPermissionsKeys = keyof ModPermissions
type ModPermissionsOpts = 'true' | 'false'
type ModPermissionsKeysOpts = `${ModPermissionsKeys}_${ModPermissionsOpts}`
type ModPermissionsDesc = {
  [k in ModPermissionsKeysOpts]: string
}
type ModPermissionsConf = {
  [k in ModPermissionsKeys]: {
    header: string
    default: boolean
  }
}
export const MODPERMISSIONS_CONF: ModPermissionsConf = {
  otherAssets: {
    header: `Others' Assets`,
    default: true
  },
  uploadPermission: {
    header: `Redistribution Permission`,
    default: true
  },
  modPermission: {
    header: `Modification Permission`,
    default: true
  },
  convPermission: {
    header: `Conversion Permission`,
    default: true
  },
  assetUsePermission: {
    header: `Asset Use Permission`,
    default: true
  },
  assetUseComPermission: {
    header: `Asset Use Permission for Commercial Mods`,
    default: false
  }
}
export const MODPERMISSIONS_DESC: ModPermissionsDesc = {
  otherAssets_true: `All assets in this file are either owned by the publisher or sourced from free-to-use modder's resources.`,
  otherAssets_false: `Not all assets in this file are owned by the publisher or sourced from free-to-use modder's resources; some assets may be.`,

  uploadPermission_true: `You are allowed to upload this file to other sites, but you must give credit to me as the creator (unless indicated otherwise).`,
  uploadPermission_false: `You are not allowed to upload this file to other sites without explicit permission.`,

  modPermission_true: `You may modify my files and release bug fixes or enhancements, provided that you credit me as the original creator.`,
  modPermission_false: `You are not allowed to convert this file for use with other games without explicit permission.`,

  convPermission_true: `You are permitted to convert this file for use with other games, as long as you credit me as the creator.`,
  convPermission_false: `You are not permitted to convert this file for use with other games without explicit permission.`,

  assetUsePermission_true: `You may use the assets in this file without needing permission, provided you give me credit.`,
  assetUsePermission_false: `You must obtain explicit permission to use the assets in this file.`,

  assetUseComPermission_true: `You are allowed to use assets from this file in mods or files that are sold for money on Steam Workshop or other platforms.`,
  assetUseComPermission_false: `You are prohibited from using assets from this file in any mods or files that are sold for money on Steam Workshop or other platforms, unless given explicit permission.`
}
