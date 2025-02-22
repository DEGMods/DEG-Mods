import { useLoaderData } from 'react-router-dom'
import { FeedPageLoaderResult } from './loader'
import { useAppSelector, useLocalStorage, useNDKContext } from 'hooks'
import { useEffect, useMemo, useState } from 'react'
import { LoadingSpinner } from 'components/LoadingSpinner'
import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { NoteSubmit } from 'components/Notes/NoteSubmit'
import { Note } from 'components/Notes/Note'
import { FeedPostsFilter, RepostFilter } from 'types'
import { DEFAULT_FILTER_OPTIONS } from 'utils'

export const FeedTabPosts = () => {
  const SHOWING_STEP = 20
  const { followList } = useLoaderData() as FeedPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined

  const { ndk } = useNDKContext()
  const [notes, setNotes] = useState<NDKEvent[]>([])
  const [discoveredNotes, setDiscoveredNotes] = useState<NDKEvent[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  const filterKey = 'filter-feed-2'
  const [filterOptions] = useLocalStorage<FeedPostsFilter>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )

  useEffect(() => {
    if (!userPubkey) return

    setIsFetching(true)
    setIsLoadMoreVisible(true)

    let sub: NDKSubscription

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
        const ndkEvents = Array.from(ndkEventSet).sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        )
        setNotes(ndkEvents)
        const firstNote = ndkEvents[0]
        const filter: NDKFilter = {
          authors: [...followList, userPubkey],
          kinds: [NDKKind.Text, NDKKind.Repost],
          since: firstNote.created_at
        }
        sub = ndk.subscribe(filter, {
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        })
        sub.on('event', (ndkEvent) => {
          setDiscoveredNotes((prev) => {
            // Skip existing
            if (
              prev.find(
                (e) =>
                  e.id === ndkEvent.id ||
                  ndkEvents.findIndex((n) => n.id === ndkEvent.id) === -1
              )
            ) {
              return [...prev]
            }

            return [...prev, ndkEvent]
          })
        })
        sub.start()
      })
      .finally(() => {
        setIsFetching(false)
      })

    return () => {
      if (sub) sub.stop()
    }
  }, [followList, ndk, userPubkey])

  const filteredNotes = useMemo(() => {
    let _notes = notes || []

    // Filter source
    // TODO: Enable source/client filter
    // _notes = _notes.filter(
    //   (n) =>
    //     !(
    //       filterOptions.source === window.location.host &&
    //       n
    //         .getMatchingTags('l')
    //         .some((l) => l[1] === window.location.host && l[2] === 'source')
    //     )
    // )

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

  const newNotes = useMemo(
    () => discoveredNotes.filter((d) => !notes.some((n) => n.id === d.id)),
    [discoveredNotes, notes]
  )

  if (!userPubkey) return null

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastNote = notes[notes.length - 1]
    const filter: NDKFilter = {
      authors: [...followList, userPubkey],
      kinds: [NDKKind.Text, NDKKind.Repost],
      limit: LOAD_MORE_STEP,
      until: lastNote.created_at
    }

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

  const discoveredCount = newNotes.length
  const handleDiscoveredClick = () => {
    // Combine newly discovred with the notes
    // Skip events already in notes
    setNotes((prev) => {
      return [...newNotes, ...prev]
    })
    // Increase showing by the discovered count
    setShowing((prev) => prev + discoveredCount)
    setDiscoveredNotes([])
  }

  return (
    <>
      <NoteSubmit />
      {discoveredCount ? (
        <div>
          <button
            className='btnMain'
            type='button'
            style={{ width: '100%' }}
            onClick={discoveredCount ? handleDiscoveredClick : undefined}
          >
            <span>
              <>Load {discoveredCount} discovered notes</>
            </span>
          </button>
        </div>
      ) : null}
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
