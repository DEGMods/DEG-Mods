import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { formatDate } from 'date-fns'
import { useAppSelector, useDidMount, useNDKContext } from 'hooks'
import { useState } from 'react'
import {
  useParams,
  useLocation,
  Link,
  useSubmit,
  useNavigation
} from 'react-router-dom'
import {
  getModPageRoute,
  getBlogPageRoute,
  getProfilePageRoute,
  appRoutes
} from 'routes'
import { CommentEvent, UserProfile } from 'types'
import { hexToNpub } from 'utils'
import { Reactions } from './Reactions'
import { Zap } from './Zap'
import { nip19 } from 'nostr-tools'
import { CommentContent } from './CommentContent'
import { NoteQuoteRepostPopup } from 'components/Notes/NoteQuoteRepostPopup'
import { NoteRepostPopup } from 'components/Notes/NoteRepostPopup'

interface CommentProps {
  comment: CommentEvent
}
export const Comment = ({ comment }: CommentProps) => {
  const { naddr } = useParams()
  const location = useLocation()
  const { ndk } = useNDKContext()
  const isMod = location.pathname.includes('/mod/')
  const isBlog = location.pathname.includes('/blog/')
  const isNote = location.pathname.includes('/feed')
  const baseUrl = naddr
    ? isMod
      ? getModPageRoute(naddr)
      : isBlog
      ? getBlogPageRoute(naddr)
      : undefined
    : isNote
    ? `${appRoutes.feed}/`
    : undefined
  const [commentEvents, setCommentEvents] = useState<CommentEvent[]>([])
  const [profile, setProfile] = useState<UserProfile>()

  const submit = useSubmit()
  const navigation = useNavigation()
  const [repostEvents, setRepostEvents] = useState<NDKEvent[]>([])
  const [quoteRepostEvents, setQuoteRepostEvents] = useState<NDKEvent[]>([])
  const [hasReposted, setHasReposted] = useState(false)
  const [hasQuoted, setHasQuoted] = useState(false)
  const [showRepostPopup, setShowRepostPopup] = useState(false)
  const [showQuoteRepostPopup, setShowQuoteRepostPopup] = useState(false)
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined
  useDidMount(() => {
    comment.event.author.fetchProfile().then((res) => setProfile(res))
    ndk
      .fetchEvents({
        kinds: [NDKKind.Text, NDKKind.GenericReply],
        '#e': [comment.event.id]
      })
      .then((ndkEventsSet) => {
        setCommentEvents(
          Array.from(ndkEventsSet).map((ndkEvent) => ({
            event: ndkEvent
          }))
        )
      })

    const repostFilter: NDKFilter = {
      kinds: [NDKKind.Repost],
      '#e': [comment.event.id]
    }
    const quoteFilter: NDKFilter = {
      kinds: [NDKKind.Text],
      '#q': [comment.event.id]
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
  })
  const handleRepost = async (confirm: boolean) => {
    if (navigation.state !== 'idle') return

    setShowRepostPopup(false)

    // Cancel if not confirmed
    if (!confirm) return

    const repostNdkEvent = await comment.event.repost(false)
    const rawEvent = repostNdkEvent.rawEvent()
    submit(
      JSON.stringify({
        intent: 'repost',
        note1: comment.event.encode(),
        data: rawEvent
      }),
      {
        method: 'post',
        encType: 'application/json',
        action: appRoutes.feed
      }
    )
  }

  const profileRoute = getProfilePageRoute(
    nip19.nprofileEncode({
      pubkey: comment.event.pubkey
    })
  )

  return (
    <div className='IBMSMSMBSSCL_Comment'>
      <div className='IBMSMSMBSSCL_CommentTop'>
        <div className='IBMSMSMBSSCL_CommentTopPPWrapper'>
          <Link
            className='IBMSMSMBSSCL_CommentTopPP'
            to={profileRoute}
            style={{
              background: `url('${
                profile?.image || ''
              }') center / cover no-repeat`
            }}
          />
        </div>
        <div className='IBMSMSMBSSCL_CommentTopDetailsWrapper'>
          <div className='IBMSMSMBSSCL_CommentTopDetails'>
            <Link className='IBMSMSMBSSCL_CTD_Name' to={profileRoute}>
              {profile?.displayName || profile?.name || ''}{' '}
            </Link>
            <Link className='IBMSMSMBSSCL_CTD_Address' to={profileRoute}>
              {hexToNpub(comment.event.pubkey)}
            </Link>
          </div>
          {comment.event.created_at && (
            <div className='IBMSMSMBSSCL_CommentActionsDetails'>
              <a className='IBMSMSMBSSCL_CADTime'>
                {formatDate(comment.event.created_at * 1000, 'hh:mm aa')}{' '}
              </a>
              <a className='IBMSMSMBSSCL_CADDate'>
                {formatDate(comment.event.created_at * 1000, 'dd/MM/yyyy')}
              </a>
            </div>
          )}
        </div>
      </div>
      <div className='IBMSMSMBSSCL_CommentBottom'>
        {comment.status && (
          <p className='IBMSMSMBSSCL_CBTextStatus'>
            <span className='IBMSMSMBSSCL_CBTextStatusSpan'>Status:</span>
            {comment.status}
          </p>
        )}
        <CommentContent content={comment.event.content} />
      </div>
      <div className='IBMSMSMBSSCL_CommentActions'>
        <div className='IBMSMSMBSSCL_CommentActionsInside'>
          <Reactions {...comment.event.rawEvent()} />

          {comment.event.kind === NDKKind.Text && (
            <>
              {/* Quote Repost, Kind 1 */}
              <div
                className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAERepost ${
                  hasQuoted ? 'IBMSMSMBSSCL_CAERepostActive' : ''
                }`}
                onClick={
                  navigation.state === 'idle'
                    ? () => setShowQuoteRepostPopup(true)
                    : undefined
                }
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 512 512'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                  className='IBMSMSMBSSCL_CAElementIcon'
                >
                  <path d='M256 31.1c-141.4 0-255.1 93.09-255.1 208c0 49.59 21.38 94.1 56.97 130.7c-12.5 50.39-54.31 95.3-54.81 95.8C0 468.8-.5938 472.2 .6875 475.2c1.312 3 4.125 4.797 7.312 4.797c66.31 0 116-31.8 140.6-51.41c32.72 12.31 69.01 19.41 107.4 19.41C397.4 447.1 512 354.9 512 239.1S397.4 31.1 256 31.1zM368 266c0 8.836-7.164 16-16 16h-54V336c0 8.836-7.164 16-16 16h-52c-8.836 0-16-7.164-16-16V282H160c-8.836 0-16-7.164-16-16V214c0-8.838 7.164-16 16-16h53.1V144c0-8.838 7.164-16 16-16h52c8.836 0 16 7.162 16 16v54H352c8.836 0 16 7.162 16 16V266z'></path>
                </svg>
                <p className='IBMSMSMBSSCL_CAElementText'>
                  {quoteRepostEvents.length}
                </p>
                <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
                  <div className='IBMSMSMBSSCL_CAElementLoad'></div>
                </div>
              </div>
              {showQuoteRepostPopup && (
                <NoteQuoteRepostPopup
                  ndkEvent={comment.event}
                  handleClose={() => setShowQuoteRepostPopup(false)}
                />
              )}

              {/* Repost, Kind 6 */}
              <div
                className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAERepost ${
                  hasReposted ? 'IBMSMSMBSSCL_CAERepostActive' : ''
                }`}
                onClick={
                  navigation.state === 'idle'
                    ? () => setShowRepostPopup(true)
                    : undefined
                }
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 -64 640 640'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                  className='IBMSMSMBSSCL_CAElementIcon'
                >
                  <path d='M614.2 334.8C610.5 325.8 601.7 319.1 592 319.1H544V176C544 131.9 508.1 96 464 96h-128c-17.67 0-32 14.31-32 32s14.33 32 32 32h128C472.8 160 480 167.2 480 176v143.1h-48c-9.703 0-18.45 5.844-22.17 14.82s-1.656 19.29 5.203 26.16l80 80.02C499.7 445.7 505.9 448 512 448s12.28-2.344 16.97-7.031l80-80.02C615.8 354.1 617.9 343.8 614.2 334.8zM304 352h-128C167.2 352 160 344.8 160 336V192h48c9.703 0 18.45-5.844 22.17-14.82s1.656-19.29-5.203-26.16l-80-80.02C140.3 66.34 134.1 64 128 64S115.7 66.34 111 71.03l-80 80.02C24.17 157.9 22.11 168.2 25.83 177.2S38.3 192 48 192H96V336C96 380.1 131.9 416 176 416h128c17.67 0 32-14.31 32-32S321.7 352 304 352z'></path>
                </svg>
                <p className='IBMSMSMBSSCL_CAElementText'>
                  {repostEvents.length}
                </p>
                <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
                  <div className='IBMSMSMBSSCL_CAElementLoad'></div>
                </div>
              </div>
              {showRepostPopup && (
                <NoteRepostPopup
                  ndkEvent={comment.event}
                  handleConfirm={handleRepost}
                  handleClose={() => setShowRepostPopup(false)}
                />
              )}
            </>
          )}

          {typeof profile?.lud16 !== 'undefined' && profile.lud16 !== '' && (
            <Zap {...comment.event.rawEvent()} />
          )}
          <Link
            className='IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReplies'
            to={baseUrl + comment.event.encode()}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 512 512'
              width='1em'
              height='1em'
              fill='currentColor'
              className='IBMSMSMBSSCL_CAElementIcon'
            >
              <path d='M256 32C114.6 32 .0272 125.1 .0272 240c0 49.63 21.35 94.98 56.97 130.7c-12.5 50.37-54.27 95.27-54.77 95.77c-2.25 2.25-2.875 5.734-1.5 8.734C1.979 478.2 4.75 480 8 480c66.25 0 115.1-31.76 140.6-51.39C181.2 440.9 217.6 448 256 448c141.4 0 255.1-93.13 255.1-208S397.4 32 256 32z'></path>
            </svg>
            <p className='IBMSMSMBSSCL_CAElementText'>{commentEvents.length}</p>
            <p className='IBMSMSMBSSCL_CAElementText'>Replies</p>
          </Link>
          <Link
            className='IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReply'
            to={baseUrl + comment.event.encode()}
          >
            <p className='IBMSMSMBSSCL_CAElementText'>Reply</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
