export enum SortBy {
  Latest = 'Latest',
  Oldest = 'Oldest',
  Best_Rated = 'Best Rated',
  Worst_Rated = 'Worst Rated'
}

export enum NSFWFilter {
  Hide_NSFW = 'Hide NSFW',
  Show_NSFW = 'Show NSFW',
  Only_NSFW = 'Only NSFW'
}

export enum ModeratedFilter {
  Moderated = 'Moderated',
  Unmoderated = 'Unmoderated',
  Unmoderated_Fully = 'Unmoderated Fully',
  Only_Blocked = 'Only Moderated'
}

export enum WOTFilterOptions {
  Site_And_Mine = 'Site & Mine',
  Site_Only = 'Site Only',
  Mine_Only = 'Mine Only',
  None = 'None',
  Exclude = 'Exclude'
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
