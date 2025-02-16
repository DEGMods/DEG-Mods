import {
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { useAppSelector, useLocalStorage, useNDKContext } from 'hooks'
import { useEffect, useMemo, useState } from 'react'
import { BlogCardDetails, FilterOptions, NSFWFilter, SortBy } from 'types'
import { DEFAULT_FILTER_OPTIONS, extractBlogCardDetails } from 'utils'
import { FeedPageLoaderResult } from './loader'
import { useLoaderData } from 'react-router-dom'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { BlogCard } from 'components/BlogCard'

export const FeedTabBlogs = () => {
  const SHOWING_STEP = 10
  const { muteLists, nsfwList, followList } =
    useLoaderData() as FeedPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined

  const filterKey = 'filter-feed-1'
  const [filterOptions] = useLocalStorage<FilterOptions>(filterKey, {
    ...DEFAULT_FILTER_OPTIONS
  })
  const { ndk } = useNDKContext()
  const [blogs, setBlogs] = useState<Partial<BlogCardDetails>[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  useEffect(() => {
    if (!userPubkey) return

    setIsFetching(true)
    setIsLoadMoreVisible(true)
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
      kinds: [NDKKind.Article],
      limit: 50
    }

    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    if (filterOptions.source === window.location.host) {
      filter['#r'] = [window.location.host]
    }

    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        setBlogs(ndkEvents.map(extractBlogCardDetails))
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [filterOptions.nsfw, filterOptions.source, followList, ndk, userPubkey])

  const filteredBlogs = useMemo(() => {
    let _blogs = blogs || []

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

    _blogs = _blogs.filter(
      (b) =>
        !muteLists.admin.authors.includes(b.author!) &&
        !muteLists.admin.replaceableEvents.includes(b.aTag!)
    )

    if (filterOptions.sort === SortBy.Latest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? b.published_at - a.published_at : 0
      )
    } else if (filterOptions.sort === SortBy.Oldest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? a.published_at - b.published_at : 0
      )
    }

    showing > 0 && _blogs.splice(showing)
    return _blogs
  }, [
    blogs,
    filterOptions.nsfw,
    filterOptions.sort,
    muteLists.admin.authors,
    muteLists.admin.replaceableEvents,
    nsfwList,
    showing
  ])

  if (!userPubkey) return null

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastBlog = filteredBlogs[filteredBlogs.length - 1]
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
      kinds: [NDKKind.Article],
      limit: LOAD_MORE_STEP
    }

    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    if (filterOptions.source === window.location.host) {
      filter['#r'] = [window.location.host]
    }

    if (filterOptions.sort === SortBy.Latest) {
      filter.until = lastBlog.published_at
    } else if (filterOptions.sort === SortBy.Oldest) {
      filter.since = lastBlog.published_at
    }

    setIsFetching(true)
    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        setBlogs((prevBlogs) => {
          const newBlogs = Array.from(ndkEventSet)
          const combinedBlogs = [
            ...prevBlogs,
            ...newBlogs.map(extractBlogCardDetails)
          ]
          const uniqueBlogs = Array.from(
            new Set(combinedBlogs.map((b) => b.id))
          )
            .map((id) => combinedBlogs.find((b) => b.id === id))
            .filter((b): b is BlogCardDetails => b !== undefined)

          if (newBlogs.length < LOAD_MORE_STEP) {
            setIsLoadMoreVisible(false)
          }

          return uniqueBlogs
        })
      })
      .finally(() => {
        setIsFetching(false)
      })
  }

  return (
    <>
      {isFetching && (
        <LoadingSpinner desc='Fetching blog details from relays' />
      )}
      {filteredBlogs.length === 0 && !isFetching && (
        <div className='IBMSMListFeedNoPosts'>
          <p>You aren't following people (or there are no posts to show)</p>
        </div>
      )}
      <div className='IBMSMSplitMainFullSideSec IBMSMSMFSSContent'>
        <div className='IBMSMList IBMSMListFeed'>
          {filteredBlogs.map((blog) => (
            <BlogCard key={blog.id} {...blog} />
          ))}
        </div>
      </div>
      {!isFetching && isLoadMoreVisible && filteredBlogs.length > 0 && (
        <div className='IBMSMListFeedLoadMore'>
          <button
            className='btn btnMain IBMSMListFeedLoadMoreBtn'
            type='button'
            onClick={handleLoadMore}
          >
            Load More
          </button>
        </div>
      )}
    </>
  )
}
