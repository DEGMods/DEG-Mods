import { Event } from 'nostr-tools'
import { BlogDetails } from 'types'

export enum CommentEventStatus {
  Publishing = 'Publishing comment...',
  Published = 'Published!',
  Failed = 'Failed to publish comment.'
}

export interface CommentEvent extends Event {
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
}

export interface DownloadUrl {
  url: string
  hash: string
  signatureKey: string
  malwareScanLink: string
  modVersion: string
  customNote: string
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
  latest: Partial<BlogDetails>[]
  isAddedToNSFW: boolean
  isBlocked: boolean
  isRepost: boolean
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
