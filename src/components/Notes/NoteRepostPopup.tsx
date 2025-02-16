import { AlertPopup } from 'components/AlertPopup'
import { useAppSelector, useDidMount } from 'hooks'
import { useState } from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { Link } from 'react-router-dom'
import { CommentContent } from 'components/comment/CommentContent'
import { getProfilePageRoute } from 'routes'
import { nip19 } from 'nostr-tools'
import { UserProfile } from 'types'
import { hexToNpub } from 'utils'
import { formatDate } from 'date-fns'

interface NoteRepostProps {
  ndkEvent: NDKEvent
  handleConfirm: (confirm: boolean) => void
  handleClose: () => void
}

export const NoteRepostPopup = ({
  ndkEvent,
  handleConfirm,
  handleClose
}: NoteRepostProps) => {
  const userState = useAppSelector((state) => state.user)
  const userPubkey = userState.user?.pubkey as string | undefined
  const [content, setContent] = useState<string>('')
  const [profile, setProfile] = useState<UserProfile>()

  useDidMount(async () => {
    const repost = await ndkEvent.repost(false)
    setContent(JSON.parse(repost.content).content)
    ndkEvent.author.fetchProfile().then((res) => setProfile(res))
  })

  const profileRoute = getProfilePageRoute(
    nip19.nprofileEncode({
      pubkey: ndkEvent.pubkey
    })
  )

  const reposterRoute = getProfilePageRoute(
    nip19.nprofileEncode({
      pubkey: userPubkey!
    })
  )

  return (
    <AlertPopup
      handleConfirm={handleConfirm}
      handleClose={handleClose}
      header={'Repost'}
      label={`Repost this?`}
      yesButtonLabel='Repost Now'
      noButtonLabel='Never mind'
    >
      <div className='IBMSMSMBSSCL_CommentQP'>
        <div className='IBMSMSMBSSCL_Comment'>
          <div className='IBMSMSMBSSCL_CommentRepost'>
            <div className='IBMSMSMBSSCL_CommentRepostVisual'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 -64 640 640'
                width='1em'
                height='1em'
                fill='currentColor'
              >
                <path d='M614.2 334.8C610.5 325.8 601.7 319.1 592 319.1H544V176C544 131.9 508.1 96 464 96h-128c-17.67 0-32 14.31-32 32s14.33 32 32 32h128C472.8 160 480 167.2 480 176v143.1h-48c-9.703 0-18.45 5.844-22.17 14.82s-1.656 19.29 5.203 26.16l80 80.02C499.7 445.7 505.9 448 512 448s12.28-2.344 16.97-7.031l80-80.02C615.8 354.1 617.9 343.8 614.2 334.8zM304 352h-128C167.2 352 160 344.8 160 336V192h48c9.703 0 18.45-5.844 22.17-14.82s1.656-19.29-5.203-26.16l-80-80.02C140.3 66.34 134.1 64 128 64S115.7 66.34 111 71.03l-80 80.02C24.17 157.9 22.11 168.2 25.83 177.2S38.3 192 48 192H96V336C96 380.1 131.9 416 176 416h128c17.67 0 32-14.31 32-32S321.7 352 304 352z'></path>
              </svg>
            </div>
            <p className='IBMSMSMBSSCL_CommentRepostText'>
              <Link to={reposterRoute}>
                {userState.user?.displayName || userState.user?.name || ''}{' '}
              </Link>
              Reposted...
            </p>
          </div>
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
                  {hexToNpub(ndkEvent.pubkey)}
                </Link>
              </div>
              {ndkEvent.created_at && (
                <div className='IBMSMSMBSSCL_CommentActionsDetails'>
                  <a className='IBMSMSMBSSCL_CADTime'>
                    {formatDate(ndkEvent.created_at * 1000, 'hh:mm aa')}{' '}
                  </a>
                  <a className='IBMSMSMBSSCL_CADDate'>
                    {formatDate(ndkEvent.created_at * 1000, 'dd/MM/yyyy')}
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className='IBMSMSMBSSCL_CommentBottom'>
            <CommentContent content={content} />
          </div>
        </div>
      </div>
    </AlertPopup>
  )
}
