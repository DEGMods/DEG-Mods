import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { BlogCard } from 'components/BlogCard'
import { BlogsFilter } from 'components/Filters/BlogsFilter'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { Pagination, PaginationOffset } from 'components/Pagination'
import { PROFILE_BLOG_FILTER_LIMIT } from '../../constants'
import {
  useNDKContext,
  useLocalStorage,
  useAppSelector,
  useServer,
  useDeletedBlogs,
  useLoadingTimeout,
  useModerationSettings
} from 'hooks'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useLoaderData, useNavigation } from 'react-router-dom'
import { NSFWFilter, BlogCardDetails, ModeratedFilter, SortBy } from 'types'
import {
  DEFAULT_FILTER_OPTIONS,
  extractBlogCardDetails,
  getFallbackPubkey,
  scrollIntoView
} from 'utils'
import { ProfilePageLoaderResult } from './loader'
import { PaginatedRequest, ServerService } from 'controllers'

export const ProfileTabBlogs = () => {
  const { profilePubkey, muteLists, nsfwList } =
    useLoaderData() as ProfilePageLoaderResult
  const navigation = useNavigation()
  const { ndk, fetchEvents } = useNDKContext()
  const [filterOptions] = useLocalStorage('filter-blog', DEFAULT_FILTER_OPTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const userState = useAppSelector((state) => state.user)
  const { enhancedModeration } = useModerationSettings()
  const blogfilter: NDKFilter = useMemo(() => {
    const filter: NDKFilter = {
      authors: [profilePubkey],
      kinds: [NDKKind.Article]
    }

    const host = window.location.host
    if (filterOptions.source === host) {
      filter['#r'] = [host]
    }

    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    return filter
  }, [filterOptions.nsfw, filterOptions.source, profilePubkey])

  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { isServerActive, isRelayFallbackActive } = useServer()
  const [pagination, setPagination] = useState({
    limit: PROFILE_BLOG_FILTER_LIMIT,
    total: 0,
    offset: 0,
    hasMore: false
  })
  const fetchModsWithPagination = useCallback(async (newOffset: number) => {
    setPagination((prev) => ({
      ...prev,
      offset: newOffset
    }))
    scrollIntoView(scrollTargetRef.current)
  }, [])
  useEffect(() => {
    if (!profilePubkey || !isServerActive) return

    setIsLoading(true)
    const serverService = ServerService.getInstance()
    const data: PaginatedRequest = {
      ...blogfilter,
      limit: pagination.limit,
      offset: pagination.offset,
      sort: filterOptions.sort === SortBy.Latest ? 'desc' : 'asc',
      sortBy: 'published_at',
      moderation: filterOptions.moderated,
      userMuteList: {
        authors: [...muteLists.user.authors],
        events: [...muteLists.user.replaceableEvents]
      }
    }
    const loggedInUserPubkey =
      (userState?.user?.pubkey as string | undefined) || getFallbackPubkey()
    if (loggedInUserPubkey) data.pubkey = loggedInUserPubkey
    if (filterOptions.nsfw === NSFWFilter.Hide_NSFW) {
      data['!#L'] = ['content-warning']
    }
    serverService
      .fetch('mods', data)
      .then((res) => {
        setBlogs(
          res.events.map((event) => {
            return extractBlogCardDetails(new NDKEvent(ndk, event))
          })
        )
        setPagination(res.pagination)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [
    blogfilter,
    filterOptions.moderated,
    filterOptions.nsfw,
    filterOptions.sort,
    isServerActive,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    ndk,
    pagination.limit,
    pagination.offset,
    profilePubkey,
    userState?.user?.pubkey
  ])

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [blogs, setBlogs] = useState<Partial<BlogCardDetails>[]>([])

  useEffect(() => {
    if (!profilePubkey || !isRelayFallbackActive) return

    // Initial blog fetch, go beyond limit to check for next
    const filter: NDKFilter = {
      ...blogfilter,
      limit: PROFILE_BLOG_FILTER_LIMIT + 1
    }
    fetchEvents(filter)
      .then((events) => {
        setBlogs(events.map(extractBlogCardDetails).filter((b) => b.naddr))
        setHasMore(events.length > PROFILE_BLOG_FILTER_LIMIT)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [blogfilter, fetchEvents, isRelayFallbackActive, profilePubkey])

  const handleNext = useCallback(() => {
    if (isLoading) return

    const last = blogs.length > 0 ? blogs[blogs.length - 1] : undefined
    if (last?.published_at) {
      const until = last?.published_at - 1
      const nextFilter = {
        ...blogfilter,
        limit: PROFILE_BLOG_FILTER_LIMIT + 1,
        until
      }
      setIsLoading(true)
      fetchEvents(nextFilter)
        .then((events) => {
          const nextBlogs = events.map(extractBlogCardDetails)
          setHasMore(nextBlogs.length > PROFILE_BLOG_FILTER_LIMIT)
          setPage((prev) => prev + 1)
          setBlogs(
            nextBlogs.slice(0, PROFILE_BLOG_FILTER_LIMIT).filter((b) => b.naddr)
          )
        })
        .finally(() => setIsLoading(false))
    }
  }, [blogfilter, blogs, fetchEvents, isLoading])

  const handlePrev = useCallback(() => {
    if (isLoading) return

    const first = blogs.length > 0 ? blogs[0] : undefined
    if (first?.published_at) {
      const since = first.published_at + 1
      const prevFilter = {
        ...blogfilter,
        limit: PROFILE_BLOG_FILTER_LIMIT,
        since
      }
      setIsLoading(true)
      fetchEvents(prevFilter)
        .then((events) => {
          setHasMore(true)
          setPage((prev) => prev - 1)
          setBlogs(events.map(extractBlogCardDetails).filter((b) => b.naddr))
        })
        .finally(() => setIsLoading(false))
    }
  }, [blogfilter, blogs, fetchEvents, isLoading])

  const { deletedBlogIds, loading: checkingDeletedBlogs } =
    useDeletedBlogs(blogs)
  const shouldBlock = useLoadingTimeout(checkingDeletedBlogs)

  const moderatedAndSortedBlogs = useMemo(() => {
    let _blogs = blogs || []
    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
    const isOwner =
      userState.user?.pubkey && userState.user.pubkey === profilePubkey
    const isUnmoderatedFully =
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
    const isOnlyBlocked =
      filterOptions.moderated === ModeratedFilter.Only_Blocked

    if (shouldBlock) {
      return []
    }

    // Filter out deleted blog posts
    _blogs = _blogs.filter((b) => !b.id || !deletedBlogIds.has(b.id))

    // Add nsfw tag to blogs included in nsfwList
    if (filterOptions.nsfw !== NSFWFilter.Hide_NSFW) {
      _blogs = _blogs.map((b) => {
        return !b.nsfw && b.aTag && nsfwList.includes(b.aTag)
          ? { ...b, nsfw: true }
          : b
      })
    }

    // Filter nsfw (Hide_NSFW option)
    _blogs = _blogs.filter(
      (b) => !(b.nsfw && filterOptions.nsfw === NSFWFilter.Hide_NSFW)
    )

    if (isOnlyBlocked && isAdmin) {
      _blogs = _blogs.filter(
        (b) =>
          muteLists.admin.authors.includes(b.author!) ||
          muteLists.admin.hardBlockedAuthors.includes(b.author!) ||
          muteLists.admin.replaceableEvents.includes(b.aTag!) ||
          muteLists.admin.hardBlockedEvents.includes(b.aTag!)
      )
    } else if (
      isUnmoderatedFully &&
      (isAdmin || isOwner || enhancedModeration)
    ) {
      // Allow "Unmoderated Fully" when author visits own profile or has enhanced moderation enabled
      // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
    } else {
      _blogs = _blogs.filter(
        (b) =>
          !muteLists.admin.authors.includes(b.author!) &&
          !muteLists.admin.hardBlockedAuthors.includes(b.author!) &&
          !muteLists.admin.replaceableEvents.includes(b.aTag!) &&
          !muteLists.admin.hardBlockedEvents.includes(b.aTag!)
      )
    }

    if (filterOptions.moderated === ModeratedFilter.Moderated) {
      _blogs = _blogs.filter(
        (b) =>
          !muteLists.user.authors.includes(b.author!) &&
          !muteLists.user.replaceableEvents.includes(b.aTag!)
      )
    }

    if (filterOptions.sort === SortBy.Latest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? b.published_at - a.published_at : 0
      )
    } else if (filterOptions.sort === SortBy.Oldest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? a.published_at - b.published_at : 0
      )
    }

    return _blogs
  }, [
    blogs,
    filterOptions.moderated,
    filterOptions.nsfw,
    filterOptions.sort,
    muteLists.admin.authors,
    muteLists.admin.hardBlockedAuthors,
    muteLists.admin.hardBlockedEvents,
    muteLists.admin.replaceableEvents,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    nsfwList,
    profilePubkey,
    userState.user?.npub,
    userState.user?.pubkey,
    deletedBlogIds,
    shouldBlock,
    enhancedModeration
  ])

  return (
    <>
      {(isLoading || navigation.state !== 'idle' || shouldBlock) && (
        <LoadingSpinner desc={'Loading...'} />
      )}

      <div className="FiltersMain">
        <BlogsFilter filterKey={'filter-blog'} author={profilePubkey} />
      </div>

      <div className="IBMSMList IBMSMListAlt" ref={scrollTargetRef}>
        {moderatedAndSortedBlogs.map((b) => (
          <BlogCard key={b.id} {...b} />
        ))}
      </div>

      {isServerActive ? (
        <PaginationOffset
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          hasMore={pagination.hasMore}
          onPageChange={fetchModsWithPagination}
        />
      ) : (
        !(page === 1 && !hasMore) && (
          <Pagination
            page={page}
            disabledNext={!hasMore}
            handlePrev={handlePrev}
            handleNext={handleNext}
          />
        )
      )}
    </>
  )
}
