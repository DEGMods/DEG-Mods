import { NDKEvent } from '@nostr-dev-kit/ndk'
import { SortBy, ModeratedFilter } from './modsFilter'
import { NSFWFilter } from './common'

export interface BlogForm {
  title: string
  content: string
  image: string
  summary: string
  tags: string
  nsfw: boolean
}

export interface BlogDetails extends BlogForm {
  id: string
  author: string
  published_at: number
  edited_at: number
  rTag: string
  dTag: string
  aTag: string
  tTags: string[]
}

export interface BlogEventSubmitForm extends BlogForm {}

export interface BlogEventEditForm extends BlogEventSubmitForm {
  dTag: string
  rTag: string
  published_at: string
}

export interface BlogFormErrors extends Partial<BlogEventSubmitForm> {}

export interface BlogCardDetails extends BlogDetails {
  naddr: string
}

export interface BlogPageLoaderResult {
  blog: Partial<BlogDetails> | undefined
  event: NDKEvent | undefined
  latest: Partial<BlogDetails>[]
  isAddedToNSFW: boolean
  isBlocked: boolean
  isHardBlocked: boolean
  hardBlockedType?: 'post' | 'user'
  postWarning?: 'user' | 'admin'
}

export interface BlogsFilterOptions {
  sort: SortBy
  nsfw: NSFWFilter
  source: string
  moderated: ModeratedFilter
}
