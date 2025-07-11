import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { PaginatedRequest, ServerService } from 'controllers'
import { LoaderFunctionArgs } from 'react-router-dom'
import { BlogCardDetails, FilterOptions, NSFWFilter, SortBy } from 'types'
import {
  DEFAULT_FILTER_OPTIONS,
  getLocalStorageItem,
  log,
  LogType,
  normalizeSearchString,
  npubToHex
} from 'utils'
import { extractBlogCardDetails } from 'utils/blog'

export const blogsRouteLoader =
  (ndkContext: NDKContextType) =>
  async ({ request }: LoaderFunctionArgs) => {
    try {
      const url = new URL(request.url)
      const search = url.searchParams.get('q')
      const page = parseInt(url.searchParams.get('page') || '1')

      // Get the blog filter options for latest blogs
      const filterOptions = JSON.parse(
        getLocalStorageItem('filter-blog-curated', DEFAULT_FILTER_OPTIONS)
      ) as FilterOptions

      const limit = 16
      const offset = (page - 1) * limit

      const blogNpubs = import.meta.env.VITE_BLOG_NPUBS.split(',')
      const blogHexkeys = blogNpubs
        .map(npubToHex)
        .filter((hexkey) => hexkey !== null)

      const filter: NDKFilter = {
        authors: blogHexkeys,
        kinds: [NDKKind.Article]
      }

      const result: {
        blogs: Partial<BlogCardDetails>[]
        pagination?: {
          total: number
          offset: number
          limit: number
          hasMore: boolean
        }
      } = {
        blogs: []
      }
      const service = ServerService.getInstance()
      if (service.getState() === 'active') {
        const data: PaginatedRequest = {
          ...filter,
          offset,
          limit,
          sort: filterOptions.sort === SortBy.Latest ? 'desc' : 'asc',
          sortBy: 'created_at'
        }
        if (search) {
          const normalizedSearchString = normalizeSearchString(search)
          if (normalizedSearchString) {
            data.search = normalizedSearchString
          }
        }
        // NSFWFilter.Show_NSFW -> skip
        // NSFWFilter.Only_NSFW -> fetch with content-warning label
        // NSFWFilter.Hide_NSFW -> fetch with content-warning negative
        if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
          data['#L'] = ['content-warning']
        } else if (filterOptions.nsfw === NSFWFilter.Hide_NSFW) {
          data['!#L'] = ['content-warning']
        }
        const res = await service.fetch('blogs-curated', data)
        result.pagination = res.pagination
        result.blogs = res.events
          .map((event) =>
            extractBlogCardDetails(new NDKEvent(ndkContext.ndk, event))
          )
          .filter((b) => b.naddr)
      } else {
        const settled = await Promise.allSettled([
          ndkContext.fetchEvents(filter),
          ndkContext.getMuteLists()
        ])

        const fetchEventsResult = settled[0]
        if (
          fetchEventsResult.status === 'fulfilled' &&
          fetchEventsResult.value
        ) {
          // Extract the blog card details from the events
          result.blogs = fetchEventsResult.value
            .map(extractBlogCardDetails)
            .filter((b) => b.naddr)
        } else if (fetchEventsResult.status === 'rejected') {
          log(
            true,
            LogType.Error,
            'Unable to fetch the blog events.',
            fetchEventsResult.reason
          )
          return { blogs: [] }
        }

        const muteListResult = settled[1]
        if (muteListResult.status === 'fulfilled' && muteListResult.value) {
          // Filter out the blocked events
          result.blogs = result.blogs.filter(
            (b) =>
              b.aTag &&
              !muteListResult.value.admin.authors.includes(b.author!) &&
              !muteListResult.value.admin.replaceableEvents.includes(b.aTag) &&
              !muteListResult.value.admin.hardBlockedEvents.includes(b.aTag) &&
              !muteListResult.value.admin.hardBlockedAuthors.includes(b.author!)
          )
        } else if (muteListResult.status === 'rejected') {
          log(
            true,
            LogType.Error,
            'Failed to fetch mutelists.',
            muteListResult.reason
          )
        }
      }

      return result
    } catch (error) {
      log(
        true,
        LogType.Error,
        'An error occurred in fetching blog details from relays',
        error
      )
      return { blogs: [] }
    }
  }
