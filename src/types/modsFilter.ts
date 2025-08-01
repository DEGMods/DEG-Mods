import { NSFWFilter, WOTFilterOptions } from './common'

export enum SortBy {
  Latest = 'Latest',
  Oldest = 'Oldest',
  Best_Rated = 'Best Rated',
  Worst_Rated = 'Worst Rated'
}

export enum ModeratedFilter {
  Moderated = 'Moderated',
  Unmoderated = 'Unmoderated',
  Unmoderated_Fully = 'Unmoderated Fully',
  Only_Blocked = 'Only Moderated'
}

export enum RepostFilter {
  Hide_Repost = 'Hide Repost',
  Show_Repost = 'Show Repost',
  Only_Repost = 'Only Repost'
}

export interface FilterOptions {
  sort: SortBy
  nsfw: NSFWFilter
  source: string
  moderated: ModeratedFilter
  wot: WOTFilterOptions
  repost: RepostFilter
}

export type FeedPostsFilter = Pick<FilterOptions, 'nsfw' | 'repost'>
