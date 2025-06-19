import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKNip07Signer
} from '@nostr-dev-kit/ndk'
import { CommentContent } from 'components/comment/CommentContent'
import { Reactions } from 'components/comment/Reactions'
import { Zap } from 'components/comment/Zap'
import { Dots } from 'components/Spinner'
import { formatDate } from 'date-fns'
import {
  useAppSelector,
  useDidMount,
  useLocalStorage,
  useNDKContext
} from 'hooks'
import { useComments } from 'hooks/useComments'
import { nip19 } from 'nostr-tools'
import { useState } from 'react'
import { Link, useNavigation, useSubmit } from 'react-router-dom'
import { appRoutes, getProfilePageRoute } from 'routes'
import { FeedPostsFilter, NSFWFilter, UserProfile } from 'types'
import { DEFAULT_FILTER_OPTIONS, hexToNpub, log, LogType } from 'utils'
import { NoteRepostPopup } from './NoteRepostPopup'
import { NoteQuoteRepostPopup } from './NoteQuoteRepostPopup'
import { NsfwCommentWrapper } from 'components/NsfwCommentWrapper'
import { AlertPopup } from 'components/AlertPopup'
import { toast } from 'react-toastify'
import { useDeleted } from 'hooks/useDeleted'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ServerService } from 'controllers/server'

interface NoteProps {
  ndkEvent: NDKEvent
}

export const Note = ({ ndkEvent }: NoteProps) => {
  const { ndk } = useNDKContext()
  const submit = useSubmit()
  const navigation = useNavigation()
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined
  const [eventProfile, setEventProfile] = useState<UserProfile>()
  const isRepost = ndkEvent.kind === NDKKind.Repost
  const filterKey = 'filter-feed-2'
  const [filterOptions] = useLocalStorage<FeedPostsFilter>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )
  const [repostEvent, setRepostEvent] = useState<NDKEvent | undefined>()
  const [repostProfile, setRepostProfile] = useState<UserProfile | undefined>()
  const noteEvent = repostEvent ?? ndkEvent
  const isNsfw = noteEvent
    .getMatchingTags('L')
    .some((t) => t[1] === 'content-warning')
  const noteProfile = repostProfile ?? eventProfile
  const { commentEvents } = useComments(
    noteEvent.pubkey,
    undefined,
    noteEvent.id
  )
  const [quoteRepostEvents, setQuoteRepostEvents] = useState<NDKEvent[]>([])
  const [hasQuoted, setHasQuoted] = useState(false)
  const [repostEvents, setRepostEvents] = useState<NDKEvent[]>([])
  const [hasReposted, setHasReposted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showRepostPopup, setShowRepostPopup] = useState(false)
  const [showQuoteRepostPopup, setShowQuoteRepostPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)

  const { isDeleted, loading: isDeletionLoading } = useDeleted(
    noteEvent.id,
    noteEvent.pubkey
  )

  useDidMount(() => {
    setIsLoading(true)
    ndkEvent.author.fetchProfile().then((res) => setEventProfile(res))

    if (isRepost) {
      try {
        const parsedEvent = JSON.parse(ndkEvent.content)
        const ndkRepostEvent = new NDKEvent(ndk, parsedEvent)
        setRepostEvent(ndkRepostEvent)
        ndkRepostEvent.author
          .fetchProfile()
          .then((res) => setRepostProfile(res))
      } catch (error) {
        if (error instanceof SyntaxError) {
          log(
            true,
            LogType.Error,
            'Event content malformed',
            error,
            ndkEvent.content
          )
        } else {
          log(true, LogType.Error, error)
        }
      }
    }

    const repostFilter: NDKFilter = {
      kinds: [NDKKind.Repost],
      '#e': [ndkEvent.id]
    }
    const quoteFilter: NDKFilter = {
      kinds: [NDKKind.Text],
      '#q': [ndkEvent.id]
    }
    ndk
      .fetchEvents([repostFilter, quoteFilter], {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
      })
      .then((ndkEventSet) => {
        const ndkEvents = Array.from(ndkEventSet)

        if (ndkEventSet.size) {
          const quoteRepostEvents = ndkEvents.filter(
            (n) => n.kind === NDKKind.Text
          )
          userPubkey &&
            setHasQuoted(
              quoteRepostEvents.some((qr) => qr.pubkey === userPubkey)
            )
          setQuoteRepostEvents(quoteRepostEvents)

          const repostEvents = ndkEvents.filter(
            (n) => n.kind === NDKKind.Repost
          )
          userPubkey &&
            setHasReposted(repostEvents.some((qr) => qr.pubkey === userPubkey))
          setRepostEvents(repostEvents)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  })

  const profileRoute = getProfilePageRoute(
    nip19.nprofileEncode({
      pubkey: noteEvent.pubkey
    })
  )

  const reposterRoute = repostEvent
    ? getProfilePageRoute(
        nip19.nprofileEncode({
          pubkey: ndkEvent.pubkey
        })
      )
    : undefined

  const baseUrl = appRoutes.feed + '/'

  // Show who reposted the note
  const reposterVisual =
    repostEvent && reposterRoute ? (
      <>
        <div className="IBMSMSMBSSCL_CommentRepost">
          <div className="IBMSMSMBSSCL_CommentRepostVisual">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 -64 640 640"
              width="1em"
              height="1em"
              fill="currentColor"
            >
              <path d="M614.2 334.8C610.5 325.8 601.7 319.1 592 319.1H544V176C544 131.9 508.1 96 464 96h-128c-17.67 0-32 14.31-32 32s14.33 32 32 32h128C472.8 160 480 167.2 480 176v143.1h-48c-9.703 0-18.45 5.844-22.17 14.82s-1.656 19.29 5.203 26.16l80 80.02C499.7 445.7 505.9 448 512 448s12.28-2.344 16.97-7.031l80-80.02C615.8 354.1 617.9 343.8 614.2 334.8zM304 352h-128C167.2 352 160 344.8 160 336V192h48c9.703 0 18.45-5.844 22.17-14.82s1.656-19.29-5.203-26.16l-80-80.02C140.3 66.34 134.1 64 128 64S115.7 66.34 111 71.03l-80 80.02C24.17 157.9 22.11 168.2 25.83 177.2S38.3 192 48 192H96V336C96 380.1 131.9 416 176 416h128c17.67 0 32-14.31 32-32S321.7 352 304 352z"></path>
            </svg>
          </div>
          <p className="IBMSMSMBSSCL_CommentRepostText">
            <Link to={reposterRoute}>
              {eventProfile?.displayName || eventProfile?.name || ''}{' '}
            </Link>
            Reposted...
          </p>
        </div>
      </>
    ) : null

  const handleRepost = async (confirm: boolean) => {
    if (navigation.state !== 'idle') return

    setShowRepostPopup(false)

    // Cancel if not confirmed
    if (!confirm) return

    const repostNdkEvent = await noteEvent.repost(false)
    const rawEvent = repostNdkEvent.rawEvent()
    submit(
      JSON.stringify({
        intent: 'repost',
        data: rawEvent
      }),
      {
        method: 'post',
        encType: 'application/json'
      }
    )
  }

  // Is this user's repost?
  const isUsersRepost =
    isRepost && ndkEvent.author.pubkey === userState.user?.pubkey

  const handleDelete = async (confirm: boolean) => {
    if (navigation.state !== 'idle') return

    setShowDeletePopup(false)

    // Cancel if not confirmed
    if (!confirm) return

    try {
      // Create deletion event (kind 5)
      const deletionEvent = new NDKEvent(ndk)
      deletionEvent.kind = 5 // Deletion event kind
      deletionEvent.content = 'Requesting deletion of note'
      deletionEvent.tags = [
        ['e', noteEvent.id] // Reference to the event being deleted
      ]

      // Add addressable event tag if it exists
      const addressableTag = noteEvent.tagValue('a')
      if (addressableTag) {
        deletionEvent.tags.push(['a', addressableTag])
      }

      if (!ndk.signer) {
        ndk.signer = new NDKNip07Signer()
      }
      await deletionEvent.sign(ndk.signer)
      const rawEvent = deletionEvent.rawEvent()

      submit(
        JSON.stringify({
          intent: 'delete',
          data: rawEvent
        }),
        {
          method: 'post',
          encType: 'application/json',
          action: appRoutes.feed
        }
      )

      // 3 seconds delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Send server delete request
      const serverService = ServerService.getInstance()
      try {
        await serverService.delete(noteEvent.id)
      } catch (error) {
        console.warn('Failed to send server delete request:', error)
      }
    } catch (error) {
      toast.error('Failed to request note deletion')
      log(true, LogType.Error, 'Failed to request note deletion', error)
    }
  }

  return (
    <div className="IBMSMSMBSSCL_CommentWrapper">
      {isDeletionLoading ? (
        <div className="IBMSMSMBSSCL_CommentLoading">
          <LoadingSpinner desc="Checking deletion status" />
        </div>
      ) : (
        <div className="IBMSMSMBSSCL_Comment">
          {reposterVisual}
          <div className="IBMSMSMBSSCL_CommentTop">
            <div className="IBMSMSMBSSCL_CommentTopPPWrapper">
              <Link
                className="IBMSMSMBSSCL_CommentTopPP"
                to={profileRoute}
                style={{
                  background: `url('${
                    noteProfile?.image || ''
                  }') center / cover no-repeat`
                }}
              />
            </div>
            <div className="IBMSMSMBSSCL_CommentTopDetailsWrapper">
              <div className="IBMSMSMBSSCL_CommentTopDetails">
                <Link className="IBMSMSMBSSCL_CTD_Name" to={profileRoute}>
                  {noteProfile?.displayName || noteProfile?.name || ''}{' '}
                </Link>
                <Link className="IBMSMSMBSSCL_CTD_Address" to={profileRoute}>
                  {hexToNpub(noteEvent.pubkey)}
                </Link>
              </div>
              {noteEvent.created_at && (
                <div className="IBMSMSMBSSCL_CommentActionsDetails">
                  <Link
                    to={baseUrl + noteEvent.encode()}
                    className="IBMSMSMBSSCL_CADTime"
                  >
                    {formatDate(noteEvent.created_at * 1000, 'hh:mm aa')}{' '}
                  </Link>
                  <Link
                    to={baseUrl + noteEvent.encode()}
                    className="IBMSMSMBSSCL_CADDate"
                  >
                    {formatDate(noteEvent.created_at * 1000, 'dd/MM/yyyy')}
                  </Link>
                </div>
              )}
            </div>
          </div>
          <NsfwCommentWrapper
            id={noteEvent.id}
            isNsfw={isNsfw}
            hideNsfwActive={NSFWFilter.Hide_NSFW === filterOptions.nsfw}
          >
            <div className="IBMSMSMBSSCL_CommentBottom">
              <CommentContent
                content={noteEvent.content}
                isNsfw={isNsfw}
                isDeleted={isDeleted}
              />
            </div>
          </NsfwCommentWrapper>
          <div className="IBMSMSMBSSCL_CommentActions">
            <div className="IBMSMSMBSSCL_CommentActionsInside">
              <Reactions {...noteEvent.rawEvent()} />
              {/* Quote Repost, Kind 1 */}
              <div
                className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAERepost ${
                  hasQuoted ? 'IBMSMSMBSSCL_CAERepostActive' : ''
                }`}
                onClick={
                  isLoading ? undefined : () => setShowQuoteRepostPopup(true)
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  className="IBMSMSMBSSCL_CAElementIcon"
                >
                  <path d="M256 31.1c-141.4 0-255.1 93.09-255.1 208c0 49.59 21.38 94.1 56.97 130.7c-12.5 50.39-54.31 95.3-54.81 95.8C0 468.8-.5938 472.2 .6875 475.2c1.312 3 4.125 4.797 7.312 4.797c66.31 0 116-31.8 140.6-51.41c32.72 12.31 69.01 19.41 107.4 19.41C397.4 447.1 512 354.9 512 239.1S397.4 31.1 256 31.1zM368 266c0 8.836-7.164 16-16 16h-54V336c0 8.836-7.164 16-16 16h-52c-8.836 0-16-7.164-16-16V282H160c-8.836 0-16-7.164-16-16V214c0-8.838 7.164-16 16-16h53.1V144c0-8.838 7.164-16 16-16h52c8.836 0 16 7.162 16 16v54H352c8.836 0 16 7.162 16 16V266z"></path>
                </svg>
                <p className="IBMSMSMBSSCL_CAElementText">
                  {isLoading ? <Dots /> : quoteRepostEvents.length}
                </p>
                <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
                  <div className="IBMSMSMBSSCL_CAElementLoad"></div>
                </div>
              </div>
              {showQuoteRepostPopup && (
                <NoteQuoteRepostPopup
                  ndkEvent={noteEvent}
                  handleClose={() => setShowQuoteRepostPopup(false)}
                />
              )}

              {/* Repost, Kind 6 */}
              {!isUsersRepost && (
                <div
                  className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAERepost ${
                    hasReposted ? 'IBMSMSMBSSCL_CAERepostActive' : ''
                  }`}
                  onClick={
                    isLoading || hasReposted
                      ? undefined
                      : () => setShowRepostPopup(true)
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -64 640 640"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMBSSCL_CAElementIcon"
                  >
                    <path d="M614.2 334.8C610.5 325.8 601.7 319.1 592 319.1H544V176C544 131.9 508.1 96 464 96h-128c-17.67 0-32 14.31-32 32s14.33 32 32 32h128C472.8 160 480 167.2 480 176v143.1h-48c-9.703 0-18.45 5.844-22.17 14.82s-1.656 19.29 5.203 26.16l80 80.02C499.7 445.7 505.9 448 512 448s12.28-2.344 16.97-7.031l80-80.02C615.8 354.1 617.9 343.8 614.2 334.8zM304 352h-128C167.2 352 160 344.8 160 336V192h48c9.703 0 18.45-5.844 22.17-14.82s1.656-19.29-5.203-26.16l-80-80.02C140.3 66.34 134.1 64 128 64S115.7 66.34 111 71.03l-80 80.02C24.17 157.9 22.11 168.2 25.83 177.2S38.3 192 48 192H96V336C96 380.1 131.9 416 176 416h128c17.67 0 32-14.31 32-32S321.7 352 304 352z"></path>
                  </svg>
                  <p className="IBMSMSMBSSCL_CAElementText">
                    {isLoading ? <Dots /> : repostEvents.length}
                  </p>
                  <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
                    <div className="IBMSMSMBSSCL_CAElementLoad"></div>
                  </div>
                </div>
              )}
              {showRepostPopup && (
                <NoteRepostPopup
                  ndkEvent={noteEvent}
                  handleConfirm={handleRepost}
                  handleClose={() => setShowRepostPopup(false)}
                />
              )}
              {typeof noteProfile?.lud16 !== 'undefined' &&
                noteProfile.lud16 !== '' && <Zap {...noteEvent.rawEvent()} />}
              <Link
                className="IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReplies"
                to={baseUrl + noteEvent.encode()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  className="IBMSMSMBSSCL_CAElementIcon"
                >
                  <path d="M256 32C114.6 32 .0272 125.1 .0272 240c0 49.63 21.35 94.98 56.97 130.7c-12.5 50.37-54.27 95.27-54.77 95.77c-2.25 2.25-2.875 5.734-1.5 8.734C1.979 478.2 4.75 480 8 480c66.25 0 115.1-31.76 140.6-51.39C181.2 440.9 217.6 448 256 448c141.4 0 255.1-93.13 255.1-208S397.4 32 256 32z"></path>
                </svg>
                <p className="IBMSMSMBSSCL_CAElementText">
                  {commentEvents.length}
                </p>
                <p className="IBMSMSMBSSCL_CAElementText">Replies</p>
              </Link>
              {!isDeleted && !isDeletionLoading && (
                <Link
                  className="IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReply"
                  to={baseUrl + noteEvent.encode()}
                >
                  <p className="IBMSMSMBSSCL_CAElementText">Reply</p>
                </Link>
              )}
              {!isDeleted &&
                !isDeletionLoading &&
                userPubkey === noteEvent.pubkey && (
                  <div
                    className="IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReply"
                    style={{ color: 'rgba(255, 70, 70, 0.65)' }}
                    onClick={() => setShowDeletePopup(true)}
                  >
                    <p className="IBMSMSMBSSCL_CAElementText">
                      Request Deletion
                    </p>
                  </div>
                )}
            </div>
          </div>
          {showDeletePopup && (
            <AlertPopup
              handleClose={() => setShowDeletePopup(false)}
              header="Request Note Deletion"
              label="Are you sure you want to request deletion of this note?"
              handleConfirm={handleDelete}
              yesButtonLabel="Request Deletion"
              yesButtonColor="rgba(255, 70, 70, 0.65)"
              noButtonLabel="Cancel"
            >
              <div>
                <p className="text-muted">
                  Note: This will create a deletion event (kind 5) that
                  references your note. The note will be marked as deleted but
                  may still be visible in some clients.
                </p>
              </div>
            </AlertPopup>
          )}
        </div>
      )}
    </div>
  )
}
