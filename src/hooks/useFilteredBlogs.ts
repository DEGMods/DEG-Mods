import { useMemo } from 'react'
import { IUserState } from 'store/reducers/user'
import {
  BlogCardDetails,
  FilterOptions,
  ModeratedFilter,
  MuteLists,
  NSFWFilter,
  SortBy
} from 'types'
import { useDeletedBlogs } from './useDeletedBlogs'
import { useLoadingTimeout } from './useLoadingTimeout'
import { useModerationSettings } from './useModerationSettings'

export const useFilteredBlogs = (
  blogs: BlogCardDetails[],
  userState: IUserState,
  filterOptions: FilterOptions,
  nsfwList: string[],
  muteLists: {
    admin: MuteLists
    user: MuteLists
  },
  author?: string | undefined
) => {
  const { deletedBlogIds, loading: checkingDeletedBlogs } =
    useDeletedBlogs(blogs)
  const shouldBlockBlogs = useLoadingTimeout(checkingDeletedBlogs)
  const { enhancedModeration } = useModerationSettings()

  return useMemo(() => {
    if (shouldBlockBlogs) {
      return []
    }

    // Filter out deleted blog posts
    let filtered = blogs.filter((blog) => !deletedBlogIds.has(blog.id))

    // Add nsfw tag to blogs included in nsfwList
    if (filterOptions.nsfw !== NSFWFilter.Hide_NSFW) {
      filtered = filtered.map((blog) => {
        return !blog.nsfw && nsfwList.includes(blog.naddr)
          ? { ...blog, nsfw: true }
          : blog
      })
    }

    // Determine the filtering logic based on the NSFW filter option
    switch (filterOptions.nsfw) {
      case NSFWFilter.Hide_NSFW:
        // If 'Hide_NSFW' is selected, filter out NSFW blogs
        filtered = filtered.filter(
          (blog) => !blog.nsfw && !nsfwList.includes(blog.naddr)
        )
        break
      case NSFWFilter.Show_NSFW:
        // If 'Show_NSFW' is selected, return all blogs (no filtering)
        break
      case NSFWFilter.Only_NSFW:
        // If 'Only_NSFW' is selected, filter to show only NSFW blogs
        filtered = filtered.filter(
          (blog) => blog.nsfw || nsfwList.includes(blog.naddr)
        )
        break
    }

    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
    const isOwner = userState.user?.pubkey === author
    const isUnmoderatedFully =
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
    const isOnlyBlocked =
      filterOptions.moderated === ModeratedFilter.Only_Blocked

    if (isOnlyBlocked && isAdmin) {
      filtered = filtered.filter(
        (blog) =>
          muteLists.admin.authors.includes(blog.author) ||
          muteLists.admin.replaceableEvents.includes(blog.naddr) ||
          muteLists.admin.hardBlockedAuthors.includes(blog.author) ||
          muteLists.admin.hardBlockedEvents.includes(blog.naddr)
      )
    } else if (
      isUnmoderatedFully &&
      (isAdmin || isOwner || enhancedModeration)
    ) {
      // Allow "Unmoderated Fully" when author visits own profile or has enhanced moderation enabled
      // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
    } else {
      filtered = filtered.filter(
        (blog) =>
          !muteLists.admin.authors.includes(blog.author) &&
          !muteLists.admin.replaceableEvents.includes(blog.naddr) &&
          !muteLists.admin.hardBlockedAuthors.includes(blog.author) &&
          !muteLists.admin.hardBlockedEvents.includes(blog.naddr)
      )
    }

    if (filterOptions.moderated === ModeratedFilter.Moderated) {
      filtered = filtered.filter(
        (blog) =>
          !muteLists.user.authors.includes(blog.author) &&
          !muteLists.user.replaceableEvents.includes(blog.naddr)
      )
    }

    if (filterOptions.sort === SortBy.Latest) {
      filtered.sort((a, b) => b.published_at - a.published_at)
    } else if (filterOptions.sort === SortBy.Oldest) {
      filtered.sort((a, b) => a.published_at - b.published_at)
    }

    return filtered
  }, [
    blogs,
    userState.user?.npub,
    userState.user?.pubkey,
    author,
    filterOptions.moderated,
    filterOptions.sort,
    filterOptions.nsfw,
    nsfwList,
    muteLists.admin.authors,
    muteLists.admin.replaceableEvents,
    muteLists.admin.hardBlockedAuthors,
    muteLists.admin.hardBlockedEvents,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    deletedBlogIds,
    shouldBlockBlogs,
    enhancedModeration
  ])
}
