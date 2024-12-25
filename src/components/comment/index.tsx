import { NDKEvent } from '@nostr-dev-kit/ndk'
import { Dots, Spinner } from 'components/Spinner'
import { ZapPopUp } from 'components/Zap'
import { formatDate } from 'date-fns'
import {
  useAppSelector,
  useBodyScrollDisable,
  useDidMount,
  useNDKContext,
  useReactions
} from 'hooks'
import { useComments } from 'hooks/useComments'
import { Event, kinds, nip19, UnsignedEvent } from 'nostr-tools'
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState
} from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getProfilePageRoute } from 'routes'
import {
  Addressable,
  CommentEvent,
  CommentEventStatus,
  UserProfile
} from 'types/index.ts'
import { abbreviateNumber, hexToNpub, log, LogType, now } from 'utils'

enum SortByEnum {
  Latest = 'Latest',
  Oldest = 'Oldest'
}

enum AuthorFilterEnum {
  All_Comments = 'All Comments',
  Creator_Comments = 'Creator Comments'
}

type FilterOptions = {
  sort: SortByEnum
  author: AuthorFilterEnum
}

type Props = {
  addressable: Addressable
  setCommentCount: Dispatch<SetStateAction<number>>
}

export const Comments = ({ addressable, setCommentCount }: Props) => {
  const { ndk, publish } = useNDKContext()
  const { commentEvents, setCommentEvents } = useComments(
    addressable.author,
    addressable.aTag
  )
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sort: SortByEnum.Latest,
    author: AuthorFilterEnum.All_Comments
  })

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    // Initial loading to indicate comments fetching (stop after 5 seconds)
    const t = window.setTimeout(() => setIsLoading(false), 5000)
    return () => {
      window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    setCommentCount(commentEvents.length)
  }, [commentEvents, setCommentCount])

  const userState = useAppSelector((state) => state.user)

  const handleSubmit = async (content: string): Promise<boolean> => {
    if (content === '') return false

    let pubkey: string

    if (userState.auth && userState.user?.pubkey) {
      pubkey = userState.user.pubkey as string
    } else {
      pubkey = (await window.nostr?.getPublicKey()) as string
    }

    if (!pubkey) {
      toast.error('Could not get user pubkey')
      return false
    }

    const unsignedEvent: UnsignedEvent = {
      content: content,
      pubkey: pubkey,
      kind: kinds.ShortTextNote,
      created_at: now(),
      tags: [
        ['e', addressable.id],
        ['a', addressable.aTag],
        ['p', addressable.author]
      ]
    }

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) return false

    setCommentEvents((prev) => [
      {
        ...signedEvent,
        status: CommentEventStatus.Publishing
      },
      ...prev
    ])

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    publish(ndkEvent)
      .then((publishedOnRelays) => {
        if (publishedOnRelays.length === 0) {
          setCommentEvents((prev) =>
            prev.map((event) => {
              if (event.id === signedEvent.id) {
                return {
                  ...event,
                  status: CommentEventStatus.Failed
                }
              }

              return event
            })
          )
        } else {
          setCommentEvents((prev) =>
            prev.map((event) => {
              if (event.id === signedEvent.id) {
                return {
                  ...event,
                  status: CommentEventStatus.Published
                }
              }

              return event
            })
          )
        }

        // when an event is successfully published remove the status from it after 15 seconds
        setTimeout(() => {
          setCommentEvents((prev) =>
            prev.map((event) => {
              if (event.id === signedEvent.id) {
                delete event.status
              }

              return event
            })
          )
        }, 15000)
      })
      .catch((err) => {
        console.error('An error occurred in publishing comment', err)
        setCommentEvents((prev) =>
          prev.map((event) => {
            if (event.id === signedEvent.id) {
              return {
                ...event,
                status: CommentEventStatus.Failed
              }
            }

            return event
          })
        )
      })

    return true
  }

  const handleDiscoveredClick = () => {
    setVisible(commentEvents)
  }
  const [visible, setVisible] = useState<CommentEvent[]>([])
  useEffect(() => {
    if (isLoading) {
      setVisible(commentEvents)
    }
  }, [commentEvents, isLoading])

  const comments = useMemo(() => {
    let filteredComments = visible
    if (filterOptions.author === AuthorFilterEnum.Creator_Comments) {
      filteredComments = filteredComments.filter(
        (comment) => comment.pubkey === addressable.author
      )
    }

    if (filterOptions.sort === SortByEnum.Latest) {
      filteredComments.sort((a, b) => b.created_at - a.created_at)
    } else if (filterOptions.sort === SortByEnum.Oldest) {
      filteredComments.sort((a, b) => a.created_at - b.created_at)
    }

    return filteredComments
  }, [visible, filterOptions.author, filterOptions.sort, addressable.author])

  const discoveredCount = commentEvents.length - visible.length
  return (
    <div className='IBMSMSMBSSCommentsWrapper'>
      <h4 className='IBMSMSMBSSTitle'>Comments</h4>
      <div className='IBMSMSMBSSComments'>
        {/* Hide comment form if aTag is missing */}
        {!!addressable.aTag && <CommentForm handleSubmit={handleSubmit} />}
        <div>
          {isLoading ? (
            <Spinner />
          ) : (
            <button
              type='button'
              className='btnMain'
              onClick={discoveredCount ? handleDiscoveredClick : undefined}
            >
              <span>Load {discoveredCount} discovered comments</span>
            </button>
          )}
        </div>
        <Filter
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
        />
        <div className='IBMSMSMBSSCommentsList'>
          {comments.map((event) => (
            <Comment key={event.id} {...event} />
          ))}
        </div>
      </div>
    </div>
  )
}

type CommentFormProps = {
  handleSubmit: (content: string) => Promise<boolean>
}

const CommentForm = ({ handleSubmit }: CommentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')

  const handleComment = async () => {
    setIsSubmitting(true)
    const submitted = await handleSubmit(commentText)
    if (submitted) setCommentText('')
    setIsSubmitting(false)
  }

  return (
    <div className='IBMSMSMBSSCommentsCreation'>
      <div className='IBMSMSMBSSCC_Top'>
        <textarea
          className='IBMSMSMBSSCC_Top_Box'
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
      </div>
      <div className='IBMSMSMBSSCC_Bottom'>
        <button
          className='btnMain'
          onClick={handleComment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Comment'}
          <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
            <div className='IBMSMSMBSSCL_CAElementLoad'></div>
          </div>
        </button>
      </div>
    </div>
  )
}

type FilterProps = {
  filterOptions: FilterOptions
  setFilterOptions: Dispatch<SetStateAction<FilterOptions>>
}

const Filter = React.memo(
  ({ filterOptions, setFilterOptions }: FilterProps) => {
    return (
      <div className='FiltersMain'>
        <div className='FiltersMainElement'>
          <div className='dropdown dropdownMain'>
            <button
              className='btn dropdown-toggle btnMain btnMainDropdown'
              aria-expanded='false'
              data-bs-toggle='dropdown'
              type='button'
            >
              {filterOptions.sort}
            </button>

            <div className='dropdown-menu dropdownMainMenu'>
              {Object.values(SortByEnum).map((item) => (
                <div
                  key={`sortBy-${item}`}
                  className='dropdown-item dropdownMainMenuItem'
                  onClick={() =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      sort: item
                    }))
                  }
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className='FiltersMainElement'>
          <div className='dropdown dropdownMain'>
            <button
              className='btn dropdown-toggle btnMain btnMainDropdown'
              aria-expanded='false'
              data-bs-toggle='dropdown'
              type='button'
            >
              {filterOptions.author}
            </button>

            <div className='dropdown-menu dropdownMainMenu'>
              {Object.values(AuthorFilterEnum).map((item) => (
                <div
                  key={`sortBy-${item}`}
                  className='dropdown-item dropdownMainMenuItem'
                  onClick={() =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      author: item
                    }))
                  }
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

const Comment = (props: CommentEvent) => {
  const { findMetadata } = useNDKContext()
  const [profile, setProfile] = useState<UserProfile>()

  useDidMount(() => {
    findMetadata(props.pubkey).then((res) => {
      setProfile(res)
    })
  })

  const profileRoute = getProfilePageRoute(
    nip19.nprofileEncode({
      pubkey: props.pubkey
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
              {hexToNpub(props.pubkey)}
            </Link>
          </div>
          <div className='IBMSMSMBSSCL_CommentActionsDetails'>
            <a className='IBMSMSMBSSCL_CADTime'>
              {formatDate(props.created_at * 1000, 'hh:mm aa')}{' '}
            </a>
            <a className='IBMSMSMBSSCL_CADDate'>
              {formatDate(props.created_at * 1000, 'dd/MM/yyyy')}
            </a>
          </div>
        </div>
      </div>
      <div className='IBMSMSMBSSCL_CommentBottom'>
        {props.status && (
          <p className='IBMSMSMBSSCL_CBTextStatus'>
            <span className='IBMSMSMBSSCL_CBTextStatusSpan'>Status:</span>
            {props.status}
          </p>
        )}
        <p className='IBMSMSMBSSCL_CBText'>{props.content}</p>
      </div>
      <div className='IBMSMSMBSSCL_CommentActions'>
        <div className='IBMSMSMBSSCL_CommentActionsInside'>
          <Reactions {...props} />
          <div
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
          </div>
          <Zap {...props} />
          <div
            className='IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReplies'
            style={{ cursor: 'not-allowed' }}
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
            <p className='IBMSMSMBSSCL_CAElementText'>0</p>
            <p className='IBMSMSMBSSCL_CAElementText'>Replies</p>
          </div>
          <div
            className='IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEReply'
            style={{ cursor: 'not-allowed' }}
          >
            <p className='IBMSMSMBSSCL_CAElementText'>Reply</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const Reactions = (props: Event) => {
  const {
    isDataLoaded,
    likesCount,
    disLikesCount,
    handleReaction,
    hasReactedPositively,
    hasReactedNegatively
  } = useReactions({
    pubkey: props.pubkey,
    eTag: props.id
  })

  return (
    <>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEUp ${
          hasReactedPositively ? 'IBMSMSMBSSCL_CAEUpActive' : ''
        }`}
        onClick={isDataLoaded ? () => handleReaction(true) : undefined}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
          className='IBMSMSMBSSCL_CAElementIcon'
        >
          <path d='M0 190.9V185.1C0 115.2 50.52 55.58 119.4 44.1C164.1 36.51 211.4 51.37 244 84.02L256 96L267.1 84.02C300.6 51.37 347 36.51 392.6 44.1C461.5 55.58 512 115.2 512 185.1V190.9C512 232.4 494.8 272.1 464.4 300.4L283.7 469.1C276.2 476.1 266.3 480 256 480C245.7 480 235.8 476.1 228.3 469.1L47.59 300.4C17.23 272.1 .0003 232.4 .0003 190.9L0 190.9z'></path>
        </svg>
        <p className='IBMSMSMBSSCL_CAElementText'>
          {isDataLoaded ? likesCount : <Dots />}
        </p>
        <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
          <div className='IBMSMSMBSSCL_CAElementLoad'></div>
        </div>
      </div>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEDown ${
          hasReactedNegatively ? 'IBMSMSMBSSCL_CAEDownActive' : ''
        }`}
        onClick={isDataLoaded ? () => handleReaction() : undefined}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
          className='IBMSMSMBSSCL_CAElementIcon'
        >
          <path d='M512 440.1C512 479.9 479.7 512 439.1 512H71.92C32.17 512 0 479.8 0 440c0-35.88 26.19-65.35 60.56-70.85C43.31 356 32 335.4 32 312C32 272.2 64.25 240 104 240h13.99C104.5 228.2 96 211.2 96 192c0-35.38 28.56-64 63.94-64h16C220.1 128 256 92.12 256 48c0-17.38-5.784-33.35-15.16-46.47C245.8 .7754 250.9 0 256 0c53 0 96 43 96 96c0 11.25-2.288 22-5.913 32h5.879C387.3 128 416 156.6 416 192c0 19.25-8.59 36.25-22.09 48H408C447.8 240 480 272.2 480 312c0 23.38-11.38 44.01-28.63 57.14C485.7 374.6 512 404.3 512 440.1z'></path>
        </svg>
        <p className='IBMSMSMBSSCL_CAElementText'>
          {isDataLoaded ? disLikesCount : <Dots />}
        </p>
        <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
          <div className='IBMSMSMBSSCL_CAElementLoad'></div>
        </div>
      </div>
    </>
  )
}

const Zap = (props: Event) => {
  const [isOpen, setIsOpen] = useState(false)
  const [totalZappedAmount, setTotalZappedAmount] = useState(0)
  const [hasZapped, setHasZapped] = useState(false)

  const userState = useAppSelector((state) => state.user)
  const { getTotalZapAmount } = useNDKContext()

  useBodyScrollDisable(isOpen)

  useDidMount(() => {
    getTotalZapAmount(
      props.pubkey,
      props.id,
      undefined,
      userState.user?.pubkey as string
    )
      .then((res) => {
        setTotalZappedAmount(res.accumulatedZapAmount)
        setHasZapped(res.hasZapped)
      })
      .catch((err) => {
        toast.error(err.message || err)
      })
  })

  return (
    <>
      <div
        className={`IBMSMSMBSSCL_CAElement IBMSMSMBSSCL_CAEBolt ${
          hasZapped ? 'IBMSMSMBSSCL_CAEBoltActive' : ''
        }`}
        onClick={() => setIsOpen(true)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-64 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
          className='IBMSMSMBSSCL_CAElementIcon'
        >
          <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z'></path>
        </svg>
        <p className='IBMSMSMBSSCL_CAElementText'>
          {abbreviateNumber(totalZappedAmount)}
        </p>
        <div className='IBMSMSMBSSCL_CAElementLoadWrapper'>
          <div className='IBMSMSMBSSCL_CAElementLoad'></div>
        </div>
      </div>
      {isOpen && (
        <ZapPopUp
          title='Tip/Zap'
          receiver={props.pubkey}
          eventId={props.id}
          handleClose={() => setIsOpen(false)}
          setTotalZapAmount={setTotalZappedAmount}
          setHasZapped={setHasZapped}
        />
      )}
    </>
  )
}
