import {
  FilterOptions,
  SortBy,
  NSFWFilter,
  ModeratedFilter,
  WOTFilterOptions,
  RepostFilter,
  CommentsSortBy,
  AuthorFilterEnum,
  CommentsFilterOptions
} from 'types'

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  sort: SortBy.Latest,
  nsfw: NSFWFilter.Hide_NSFW,
  source: window.location.host,
  moderated: ModeratedFilter.Moderated,
  wot: WOTFilterOptions.Site_Only,
  repost: RepostFilter.Show_Repost
}

export const DEFAULT_COMMENT_FILTER_OPTIONS: CommentsFilterOptions = {
  sort: CommentsSortBy.Latest,
  author: AuthorFilterEnum.All_Comments,
  wot: WOTFilterOptions.Site_Only,
  nsfw: NSFWFilter.Hide_NSFW,
  source: window.location.host
}

export const DEFAULT_EXCLUDED_TAGS: string[] = ['Loli', 'Gore', 'Politics']
