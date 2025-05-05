import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { FeedFilter } from 'components/Filters/FeedFilter'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { Note } from 'components/Notes/Note'
import { useNDKContext, useLocalStorage } from 'hooks'
import { useState, useEffect, useMemo } from 'react'
import { useLoaderData } from 'react-router-dom'
import { FeedPostsFilter, RepostFilter } from 'types'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { ProfilePageLoaderResult } from './loader'

export const ProfileTabPosts = () => {
  const SHOWING_STEP = 20
  const { profilePubkey } = useLoaderData() as ProfilePageLoaderResult
  const { ndk } = useNDKContext()
  const [notes, setNotes] = useState<NDKEvent[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  const filterKey = 'filter-feed-2'
  const [filterOptions] = useLocalStorage<FeedPostsFilter>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )

  useEffect(() => {
    setIsFetching(true)
    setIsLoadMoreVisible(true)

    const filter: NDKFilter = {
      authors: [profilePubkey],
      kinds: [NDKKind.Text, NDKKind.Repost],
      limit: 50
    }

    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)
        setNotes(ndkEvents)
      })
      .finally(() => {
        setIsFetching(false)
      })
  }, [ndk, profilePubkey])

  const filteredNotes = useMemo(() => {
    let _notes = notes || []
    _notes = _notes.filter((n) => {
      if (n.kind === NDKKind.Text) {
        // Filter out the replies (Kind 1 events with e tags are replies to other kind 1 events)
        return n.getMatchingTags('e').length === 0
      }
      // Filter repost events if the option is set to hide reposts
      return !(
        n.kind === NDKKind.Repost &&
        filterOptions.repost === RepostFilter.Hide_Repost
      )
    })

    _notes = _notes.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))

    showing > 0 && _notes.splice(showing)
    return _notes
  }, [filterOptions.repost, notes, showing])

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastNote = notes[notes.length - 1]
    const filter: NDKFilter = {
      authors: [profilePubkey],
      kinds: [NDKKind.Text, NDKKind.Repost],
      limit: LOAD_MORE_STEP
    }

    filter.until = lastNote.created_at

    setIsFetching(true)
    ndk
      .fetchEvents(filter, {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        setNotes((prevNotes) => {
          const newNotes = Array.from(ndkEventSet)
          const combinedNotes = [...prevNotes, ...newNotes]
          const uniqueBlogs = Array.from(
            new Set(combinedNotes.map((b) => b.id))
          )
            .map((id) => combinedNotes.find((b) => b.id === id))
            .filter((b) => b !== undefined)

          if (newNotes.length < LOAD_MORE_STEP) {
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
      <FeedFilter tab={2} />
      {isFetching && <LoadingSpinner desc="Fetching notes from relays" />}
      {filteredNotes.length === 0 && !isFetching && (
        <div className="IBMSMListFeedNoPosts">
          <p>There are no posts to show</p>
        </div>
      )}
      <div className="IBMSMSplitMainFullSideSec IBMSMSMFSSContent">
        <div className="IBMSMSMFSSContentPosts">
          {filteredNotes.map((note) => (
            <Note key={note.id} ndkEvent={note} />
          ))}
        </div>
      </div>
      {!isFetching && isLoadMoreVisible && filteredNotes.length > 0 && (
        <div className="IBMSMListFeedLoadMore">
          <button
            className="btn btnMain IBMSMListFeedLoadMoreBtn"
            type="button"
            onClick={handleLoadMore}
          >
            Load More
          </button>
        </div>
      )}
    </>
  )
}
