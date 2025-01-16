import { FALLBACK_PROFILE_IMAGE } from 'constants.ts'
import { Event, Filter, kinds, nip19, UnsignedEvent } from 'nostr-tools'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  useAppSelector,
  useBodyScrollDisable,
  useDidMount,
  useNDKContext
} from '../hooks'
import { appRoutes, getProfilePageRoute } from '../routes'
import '../styles/author.css'
import '../styles/innerPage.css'
import '../styles/socialPosts.css'
import { UserRelaysType } from '../types'
import {
  copyTextToClipboard,
  hexToNpub,
  log,
  LogType,
  now,
  npubToHex
} from '../utils'
import { LoadingSpinner } from './LoadingSpinner'
import { ZapPopUp } from './Zap'
import placeholder from '../assets/img/DEGMods Placeholder Img.png'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useProfile } from 'hooks/useProfile'

type Props = {
  pubkey: string
}

export const ProfileSection = ({ pubkey }: Props) => {
  return (
    <div className='IBMSMSplitMainSmallSide'>
      <div className='IBMSMSplitMainSmallSideSecWrapper'>
        <div className='IBMSMSplitMainSmallSideSec'>
          <Profile pubkey={pubkey} />
        </div>
        <div className='IBMSMSplitMainSmallSideSec'>
          <div className='IBMSMSMSSS_ShortPosts'>
            {posts.map((post, index) => (
              <a
                key={'post' + index}
                className='IBMSMSMSSS_ShortPostsPostLink'
                href={post.link}
              >
                <div className='IBMSMSMSSS_ShortPostsPost'>
                  <div className='IBMSMSMSSS_ShortPostsPost_Top'>
                    <p className='IBMSMSMSSS_ShortPostsPost_TopName'>
                      {post.name}
                    </p>
                    <div className='IBMSMSMSSS_ShortPostsPost_TopLink'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='-32 0 512 512'
                        width='1em'
                        height='1em'
                        fill='currentColor'
                        className='IBMSMSMSSS_ShortPostsPost_TopLinkIcon'
                        style={{ width: '100%', height: '100%' }}
                      >
                        <path d='M256 64C256 46.33 270.3 32 288 32H415.1C415.1 32 415.1 32 415.1 32C420.3 32 424.5 32.86 428.2 34.43C431.1 35.98 435.5 38.27 438.6 41.3C438.6 41.35 438.6 41.4 438.7 41.44C444.9 47.66 447.1 55.78 448 63.9C448 63.94 448 63.97 448 64V192C448 209.7 433.7 224 416 224C398.3 224 384 209.7 384 192V141.3L214.6 310.6C202.1 323.1 181.9 323.1 169.4 310.6C156.9 298.1 156.9 277.9 169.4 265.4L338.7 96H288C270.3 96 256 81.67 256 64V64zM0 128C0 92.65 28.65 64 64 64H160C177.7 64 192 78.33 192 96C192 113.7 177.7 128 160 128H64V416H352V320C352 302.3 366.3 288 384 288C401.7 288 416 302.3 416 320V416C416 451.3 387.3 480 352 480H64C28.65 480 0 451.3 0 416V128z'></path>
                      </svg>
                    </div>
                  </div>
                  <div className='IBMSMSMSSS_ShortPostsPost_Bottom'>
                    <p>{post.content}</p>
                    {post.imageUrl && (
                      <div
                        className='IBMSMSMSSS_ShortPostsPost_BottomImg'
                        style={{
                          background: `linear-gradient(0deg, #232323 5%, rgba(255, 255, 255, 0)), url("${post.imageUrl}") top / cover no-repeat`
                        }}
                      ></div>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type ProfileProps = {
  pubkey: string
}

export const Profile = ({ pubkey }: ProfileProps) => {
  const profile = useProfile(pubkey)

  const displayName =
    profile?.displayName || profile?.name || '[name not set up]'
  const about = profile?.bio || profile?.about || '[bio not set up]'
  const image = profile?.image || FALLBACK_PROFILE_IMAGE
  const nip05 = profile?.nip05
  const lud16 = profile?.lud16

  const npub = hexToNpub(pubkey)

  const handleCopy = async () => {
    copyTextToClipboard(npub).then((isCopied) => {
      if (isCopied) {
        toast.success('Npub copied to clipboard!')
      } else {
        toast.error(
          'Failed to copy, look into console for more details on error!'
        )
      }
    })
  }

  // Try to encode
  let profileRoute = appRoutes.home
  let nprofile: string | undefined
  try {
    const hexPubkey = npubToHex(pubkey)
    nprofile = hexPubkey
      ? nip19.nprofileEncode({
          pubkey: hexPubkey
        })
      : undefined
    profileRoute = nprofile ? getProfilePageRoute(nprofile) : appRoutes.home
  } catch (error) {
    // Silently ignore and redirect to home
    log(true, LogType.Error, 'Failed to encode profile.', error)
  }

  return (
    <div className='IBMSMSMSSS_Author'>
      <div className='IBMSMSMSSS_Author_Top'>
        <div className='IBMSMSMSSS_Author_Top_Left'>
          <Link
            className='IBMSMSMSSS_Author_Top_Left_InsideLinkWrapper'
            to={profileRoute}
          >
            <div className='IBMSMSMSSS_Author_Top_Left_Inside'>
              <div className='IBMSMSMSSS_Author_Top_Left_InsidePic'>
                <div className='IBMSMSMSSS_Author_Top_PPWrapper'>
                  <div
                    className='IBMSMSMSSS_Author_Top_PP'
                    style={{
                      background: `url('${image}') center / cover no-repeat`
                    }}
                  ></div>
                </div>
              </div>
              <div className='IBMSMSMSSS_Author_Top_Left_InsideDetails'>
                <div className='IBMSMSMSSS_Author_TopWrapper'>
                  <p className='IBMSMSMSSS_Author_Top_Name'>{displayName}</p>
                  {/* Nip05 can sometimes be an empty object '{}' which causes the error */}
                  {typeof nip05 === 'string' && nip05 !== '' && (
                    <p className='IBMSMSMSSS_Author_Top_Handle'>{nip05}</p>
                  )}
                </div>
              </div>
            </div>
          </Link>
          <div className='IBMSMSMSSS_Author_Top_AddressWrapper'>
            <div className='IBMSMSMSSS_Author_Top_AddressWrapped'>
              <p
                id='SiteOwnerAddress'
                className='IBMSMSMSSS_Author_Top_Address'
              >
                {npub}
              </p>
            </div>
            <div className='IBMSMSMSSS_Author_Top_IconWrapper'>
              <div
                id='copySiteOwnerAddress'
                className='IBMSMSMSSS_Author_Top_IconWrapped'
                onClick={handleCopy}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 512 512'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                  className='IBMSMSMSSS_Author_Top_Icon'
                >
                  <path d='M384 96L384 0h-112c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48H464c26.51 0 48-21.49 48-48V128h-95.1C398.4 128 384 113.6 384 96zM416 0v96h96L416 0zM192 352V128h-144c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h192c26.51 0 48-21.49 48-48L288 416h-32C220.7 416 192 387.3 192 352z'></path>
                </svg>
              </div>
              {typeof nprofile !== 'undefined' && (
                <ProfileQRButtonWithPopUp nprofile={nprofile} />
              )}
              {typeof lud16 !== 'undefined' && lud16 !== '' && (
                <ZapButtonWithPopUp pubkey={pubkey} />
              )}
            </div>
          </div>
        </div>
        <div className='IBMSMSMSSS_Author_Top_Details'>
          <p className='IBMSMSMSSS_Author_Top_Bio'>{about}</p>
          <div
            id='OwnerFollowLogin'
            className='IBMSMSMSSS_Author_Top_NostrLinks'
            style={{ display: 'flex' }}
          ></div>
        </div>
      </div>
      <FollowButton pubkey={pubkey} />
    </div>
  )
}

interface Post {
  name: string
  link: string
  content: string
  imageUrl?: string
}

const posts: Post[] = [
  {
    name: 'User name',
    link: `feed-note.html`,
    content: `user text, this is a long string of temporary text that would be replaced with the user post from their short posts`
  },
  {
    name: 'User name',
    link: 'feed-note.html',
    content: `user text, this is a long string of temporary text that would be replaced with the user post from their short posts`
  },
  {
    name: 'User name',
    link: `feed-note.html`,
    content: `user text, this is a long string of temporary text that would be replaced with the user post from their short posts`,
    imageUrl: placeholder
  }
]

type QRButtonWithPopUpProps = {
  nprofile: string
}

export const ProfileQRButtonWithPopUp = ({
  nprofile
}: QRButtonWithPopUpProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useBodyScrollDisable(isOpen)

  const onQrCodeClicked = async () => {
    const href = `https://njump.me/${nprofile}`
    const a = document.createElement('a')
    a.href = href
    a.target = '_blank' // Open in a new tab
    a.rel = 'noopener noreferrer' // Recommended for security reasons
    a.click()
  }

  return (
    <>
      <div
        className='IBMSMSMSSS_Author_Top_IconWrapped IBMSMSMSSS_Author_Top_IconWrappedQR'
        onClick={() => setIsOpen(true)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-32 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
          className='IBMSMSMSSS_Author_Top_Icon'
        >
          <path d='M144 32C170.5 32 192 53.49 192 80V176C192 202.5 170.5 224 144 224H48C21.49 224 0 202.5 0 176V80C0 53.49 21.49 32 48 32H144zM128 96H64V160H128V96zM144 288C170.5 288 192 309.5 192 336V432C192 458.5 170.5 480 144 480H48C21.49 480 0 458.5 0 432V336C0 309.5 21.49 288 48 288H144zM128 352H64V416H128V352zM256 80C256 53.49 277.5 32 304 32H400C426.5 32 448 53.49 448 80V176C448 202.5 426.5 224 400 224H304C277.5 224 256 202.5 256 176V80zM320 160H384V96H320V160zM352 448H384V480H352V448zM448 480H416V448H448V480zM416 288H448V416H352V384H320V480H256V288H352V320H416V288z'></path>
        </svg>
      </div>

      {isOpen && (
        <div className='popUpMain'>
          <div className='ContainerMain'>
            <div className='popUpMainCardWrapper'>
              <div className='popUpMainCard popUpMainCardQR'>
                <div className='popUpMainCardTop'>
                  <div className='popUpMainCardTopInfo'>
                    <h3>Nostr Address</h3>
                  </div>
                  <div
                    className='popUpMainCardTopClose'
                    onClick={() => setIsOpen(false)}
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='-96 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      style={{ zIndex: 1 }}
                    >
                      <path d='M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z'></path>
                    </svg>
                  </div>
                </div>
                <div className='popUpMainCardBottom'>
                  <QRCodeSVG
                    className='popUpMainCardBottomQR'
                    onClick={onQrCodeClicked}
                    value={nprofile}
                    height={235}
                    width={235}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type ZapButtonWithPopUpProps = {
  pubkey: string
}

const ZapButtonWithPopUp = ({ pubkey }: ZapButtonWithPopUpProps) => {
  const [isOpen, setIsOpen] = useState(false)

  useBodyScrollDisable(isOpen)

  return (
    <>
      <div
        className='IBMSMSMSSS_Author_Top_IconWrapped'
        onClick={() => setIsOpen(true)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-32 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
          className='IBMSMSMSSS_Author_Top_Icon'
        >
          <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z'></path>
        </svg>
      </div>
      {isOpen && (
        <ZapPopUp
          title='Tip/Zap'
          receiver={pubkey}
          handleClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

type FollowButtonProps = {
  pubkey: string
}

const FollowButton = ({ pubkey }: FollowButtonProps) => {
  const { ndk, fetchEventFromUserRelays, publish } = useNDKContext()
  const [isFollowing, setIsFollowing] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')

  const userState = useAppSelector((state) => state.user)

  useDidMount(async () => {
    if (userState.auth && userState.user?.pubkey) {
      const userHexKey = userState.user.pubkey as string
      const { isFollowing: isAlreadyFollowing } = await checkIfFollowing(
        userHexKey,
        pubkey
      )
      setIsFollowing(isAlreadyFollowing)
    }
  })

  const getUserPubKey = async (): Promise<string | null> => {
    if (userState.auth && userState.user?.pubkey) {
      return userState.user.pubkey as string
    } else {
      return (await window.nostr?.getPublicKey()) as string
    }
  }

  const checkIfFollowing = async (
    userHexKey: string,
    pubkey: string
  ): Promise<{
    isFollowing: boolean
    tags: string[][]
  }> => {
    const filter: Filter = {
      kinds: [kinds.Contacts],
      authors: [userHexKey]
    }

    const contactListEvent = await fetchEventFromUserRelays(
      filter,
      userHexKey,
      UserRelaysType.Both
    )

    if (!contactListEvent)
      return {
        isFollowing: false,
        tags: []
      }

    return {
      isFollowing: contactListEvent.tags.some(
        (t) => t[0] === 'p' && t[1] === pubkey
      ),
      tags: contactListEvent.tags
    }
  }

  const signAndPublishEvent = async (
    unsignedEvent: UnsignedEvent
  ): Promise<boolean> => {
    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) return false

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    if (publishedOnRelays.length === 0) {
      toast.error('Failed to publish event on any relay')
      return false
    }

    toast.success(
      `Event published successfully to the following relays\n\n${publishedOnRelays.join(
        '\n'
      )}`
    )
    return true
  }

  const handleFollow = async () => {
    setIsLoading(true)
    setLoadingSpinnerDesc('Processing follow request')

    const userHexKey = await getUserPubKey()
    if (!userHexKey) {
      setIsLoading(false)
      toast.error('Could not get pubkey')
      return
    }

    const { isFollowing: isAlreadyFollowing, tags } = await checkIfFollowing(
      userHexKey,
      pubkey
    )
    if (isAlreadyFollowing) {
      toast.info('Already following!')
      setIsFollowing(true)
      setIsLoading(false)
      return
    }

    const unsignedEvent: UnsignedEvent = {
      content: '',
      created_at: now(),
      kind: kinds.Contacts,
      pubkey: userHexKey,
      tags: [...tags, ['p', pubkey]]
    }

    setLoadingSpinnerDesc('Signing and publishing follow event')
    const success = await signAndPublishEvent(unsignedEvent)
    setIsFollowing(success)
    setIsLoading(false)
  }

  const handleUnFollow = async () => {
    setIsLoading(true)
    setLoadingSpinnerDesc('Processing unfollow request')

    const userHexKey = await getUserPubKey()
    if (!userHexKey) {
      setIsLoading(false)
      toast.error('Could not get pubkey')
      return
    }

    const filter: Filter = {
      kinds: [kinds.Contacts],
      authors: [userHexKey]
    }

    const contactListEvent = await fetchEventFromUserRelays(
      filter,
      userHexKey,
      UserRelaysType.Both
    )

    if (
      !contactListEvent ||
      !contactListEvent.tags.some((t) => t[0] === 'p' && t[1] === pubkey)
    ) {
      // could not found target pubkey in user's follow list
      // so, just update the status and return
      setIsFollowing(false)
      setIsLoading(false)
      return
    }

    const unsignedEvent: UnsignedEvent = {
      content: '',
      created_at: now(),
      kind: kinds.Contacts,
      pubkey: userHexKey,
      tags: contactListEvent.tags.filter(
        (t) => !(t[0] === 'p' && t[1] === pubkey)
      )
    }

    setLoadingSpinnerDesc('Signing and publishing unfollow event')
    const success = await signAndPublishEvent(unsignedEvent)
    setIsFollowing(!success)
    setIsLoading(false)
  }

  return (
    <>
      <button
        className='btn btnMain'
        type='button'
        onClick={isFollowing ? handleUnFollow : handleFollow}
      >
        {isFollowing ? 'Un-Follow' : 'Follow'}
      </button>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
    </>
  )
}
