import {
  FilterOptions,
  SortBy,
  NSFWFilter,
  ModeratedFilter,
  WOTFilterOptions,
  RepostFilter
} from 'types'

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  sort: SortBy.Latest,
  nsfw: NSFWFilter.Hide_NSFW,
  source: window.location.host,
  moderated: ModeratedFilter.Moderated,
  wot: WOTFilterOptions.Site_Only,
  repost: RepostFilter.Show_Repost
}
