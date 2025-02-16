import { NDKKind } from '@nostr-dev-kit/ndk'
import { formatDate } from 'date-fns'
import { useDidMount, useNDKContext } from 'hooks'
import { useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
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
  })

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
          {/* <div
            className='IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAERepost'
            style={{ cursor: 'not-allowed' }}
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
            <p className='IBMSMSMBSSCL_CAElementText'>0</p>
            <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
              <div className='IBMSMSMBSSCL_CAElementLoad'></div>
            </div>
          </div> */}
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
