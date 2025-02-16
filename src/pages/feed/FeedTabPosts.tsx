import { useLoaderData } from 'react-router-dom'
import { FeedPageLoaderResult } from './loader'
import { useAppSelector, useLocalStorage, useNDKContext } from 'hooks'
import { FilterOptions, NSFWFilter } from 'types'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { useEffect, useMemo, useState } from 'react'
import { LoadingSpinner } from 'components/LoadingSpinner'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { NoteSubmit } from 'components/Notes/NoteSubmit'
import { Note } from 'components/Notes/Note'

export const FeedTabPosts = () => {
  const SHOWING_STEP = 20
  const { followList } = useLoaderData() as FeedPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined
  const filterKey = 'filter-feed-2'
  const [filterOptions] = useLocalStorage<FilterOptions>(filterKey, {
    ...DEFAULT_FILTER_OPTIONS
  })
  const { ndk } = useNDKContext()
  const [notes, setNotes] = useState<NDKEvent[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  useEffect(() => {
    if (!userPubkey) return

    setIsFetching(true)
    setIsLoadMoreVisible(true)

    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
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
  }, [followList, ndk, userPubkey])

  const filteredNotes = useMemo(() => {
    let _notes = notes || []

    // Filter nsfw (Hide_NSFW option)
    _notes = _notes.filter(
      (n) =>
        !(
          filterOptions.nsfw === NSFWFilter.Hide_NSFW &&
          n.tagValue('L') === 'content-warning'
        )
    )

    // Filter source
    _notes = _notes.filter(
      (n) =>
        !(
          filterOptions.source === window.location.host &&
          n
            .getMatchingTags('l')
            .some((l) => l[1] === window.location.host && l[2] === 'source')
        )
    )

    // Filter reply events
    _notes = _notes.filter((n) => n.getMatchingTags('e').length === 0)

    _notes = _notes.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))

    showing > 0 && _notes.splice(showing)
    return _notes
  }, [filterOptions.nsfw, filterOptions.source, notes, showing])

  if (!userPubkey) return null

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastNote = filteredNotes[filteredNotes.length - 1]
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
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
      <NoteSubmit />
      {isFetching && <LoadingSpinner desc='Fetching notes from relays' />}
      {filteredNotes.length === 0 && !isFetching && (
        <div className='IBMSMListFeedNoPosts'>
          <p>You aren't following people (or there are no posts to show)</p>
        </div>
      )}
      <div className='IBMSMSplitMainFullSideSec IBMSMSMFSSContent'>
        <div className='IBMSMSMFSSContentPosts'>
          {filteredNotes.map((note) => (
            <Note key={note.id} ndkEvent={note} />
          ))}
        </div>
      </div>
      {!isFetching && isLoadMoreVisible && filteredNotes.length > 0 && (
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
