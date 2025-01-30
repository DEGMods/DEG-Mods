import { NDKEvent } from '@nostr-dev-kit/ndk'

export interface CommentsLoaderResult {
  event: NDKEvent
}

export enum SortByEnum {
  Latest = 'Latest',
  Oldest = 'Oldest'
}

export enum AuthorFilterEnum {
  All_Comments = 'All Comments',
  Creator_Comments = 'Creator Comments'
}
