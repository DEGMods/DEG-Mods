import { NDKEvent } from '@nostr-dev-kit/ndk'
import { WOTFilterOptions, NSFWFilter } from './common'

export interface CommentsLoaderResult {
  event: NDKEvent
}

export enum CommentsSortBy {
  Latest = 'Latest',
  Oldest = 'Oldest'
}

export enum AuthorFilterEnum {
  All_Comments = 'All Comments',
  Creator_Comments = 'Creator Comments'
}

export interface CommentsFilterOptions {
  sort: CommentsSortBy
  author: AuthorFilterEnum
  wot: WOTFilterOptions
  source: string
  nsfw: NSFWFilter
}
