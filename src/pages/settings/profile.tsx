import { InputField } from 'components/Inputs'
import { ProfileQRButtonWithPopUp } from 'components/ProfileSection'
import { useAppDispatch, useAppSelector, useNDKContext } from 'hooks'
import { kinds, nip19, UnsignedEvent, Event } from 'nostr-tools'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { appRoutes, getProfilePageRoute } from 'routes'
import { copyTextToClipboard, log, LogType, now, npubToHex } from 'utils'
import 'styles/profile.css'
import {
  NDKEvent,
  NDKUserProfile,
  profileFromEvent,
  serializeProfile
} from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { setUser } from 'store/reducers/user'
import placeholderMod from '../../assets/img/DEGMods Placeholder Img.png'
import placeholderPP from '../../assets/img/DEG Mods Default PP.png'

type FormState = {
  name: string
  displayName: string
  bio: string
  picture: string
  banner: string
  nip05: string
  lud16: string
}

const defaultFormState: FormState = {
  name: '',
  displayName: '',
  bio: '',
  picture: '',
  banner: '',
  nip05: '',
  lud16: ''
}

export const ProfileSettings = () => {
  const dispatch = useAppDispatch()
  const userState = useAppSelector((state) => state.user)
  const { ndk, publish } = useNDKContext()

  const [isPublishing, setIsPublishing] = useState(false)
  const [formState, setFormState] = useState<FormState>(defaultFormState)

  useEffect(() => {
    if (userState.auth && userState.user) {
      const {
        name,
        displayName,
        about,
        bio,
        image,
        picture,
        banner,
        nip05,
        lud16
      } = userState.user

      setFormState({
        name: name || '',
        displayName: displayName || '',
        bio: bio || about || '',
        picture: typeof picture === 'string' ? picture : image || '',
        banner: banner || '',
        nip05: nip05 || '',
        lud16: lud16 || ''
      })
    } else {
      setFormState(defaultFormState)
    }
  }, [userState])

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const banner = formState.banner || placeholderMod

  const picture = formState.picture || placeholderPP

  const name = formState.displayName || formState.name || 'User name'

  const nip05 = formState.nip05 || 'nip5handle@domain.com'

  const npub = (userState.user?.npub as string) || 'npub1address'

  const bio =
    formState.bio ||
    'user bio, this is a long string of temporary text that would be replaced with the user bio from their metadata address'

  // In case user is not logged in clicking on profile link will navigate to homepage
  let profileRoute = appRoutes.home
  let nprofile: string | undefined
  if (userState.auth && userState.user) {
    const hexPubkey = npubToHex(userState.user.npub as string)

    if (hexPubkey) {
      nprofile = nip19.nprofileEncode({
        pubkey: hexPubkey
      })
      profileRoute = getProfilePageRoute(nprofile)
    }
  }

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

  const handlePublish = async () => {
    if (!userState.auth && !userState.user?.pubkey) return

    setIsPublishing(true)

    const prevProfile = userState.user as NDKUserProfile
    const updatedProfile = {
      ...prevProfile,
      name: formState.name,
      displayName: formState.displayName,
      bio: formState.bio,
      picture: formState.picture,
      banner: formState.banner,
      nip05: formState.nip05,
      lud16: formState.lud16
    }

    const serializedProfile = serializeProfile(updatedProfile)

    const unsignedEvent: UnsignedEvent = {
      kind: kinds.Metadata,
      tags: [],
      content: serializedProfile,
      created_at: now(),
      pubkey: userState.user?.pubkey as string
    }

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) {
      setIsPublishing(false)
      return
    }

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    // Handle cases where publishing failed or succeeded
    if (publishedOnRelays.length === 0) {
      toast.error('Failed to publish event on any relay')
    } else {
      toast.success(
        `Event published successfully to the following relays\n\n${publishedOnRelays.join(
          '\n'
        )}`
      )

      const ndkEvent = new NDKEvent(undefined, signedEvent)
      const userProfile = profileFromEvent(ndkEvent)
      dispatch(setUser(userProfile))
    }

    setIsPublishing(false)
  }

  return (
    <>
      {isPublishing && <LoadingSpinner desc='Publishing event' />}
      <div className='IBMSMSplitMainFullSideFWMid'>
        <div className='IBMSMSplitMainFullSideSec'>
          <div className='IBMSMSMBSS_Profile'>
            <div className='IBMSMSMBSS_ProfilePreview'>
              <div className='IBMSMSMSSS_Author_Top_Left'>
                <div
                  className='IBMSMSMSSS_Author_Top_Banner'
                  style={{
                    background: `url(${banner}) center / cover no-repeat`
                  }}
                ></div>
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
                            background: `url(${picture}) center / cover no-repeat`
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className='IBMSMSMSSS_Author_Top_Left_InsideDetails'>
                      <div className='IBMSMSMSSS_Author_TopWrapper'>
                        <p className='IBMSMSMSSS_Author_Top_Name'>{name}</p>
                        <p className='IBMSMSMSSS_Author_Top_Handle'>{nip05}</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className='IBMSMSMSSS_Author_Top_AddressWrapper'>
                  <div className='IBMSMSMSSS_Author_Top_AddressWrapped'>
                    <p
                      id='SiteOwnerAddress-1'
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
                  </div>
                </div>
                <div className='IBMSMSMSSS_Author_Top_Details'>
                  <p className='IBMSMSMSSS_Author_Top_Bio'>{bio}</p>
                  <div
                    id='OwnerFollowLogin-1'
                    className='IBMSMSMSSS_Author_Top_NostrLinks'
                    style={{ display: 'flex' }}
                  ></div>
                </div>
              </div>
            </div>
            <div className='IBMSMSMBSS_ProfileEdit'>
              <InputField
                label='Name'
                placeholder=''
                name='name'
                value={formState.name}
                onChange={handleInputChange}
              />
              <InputField
                label='Display name'
                placeholder=''
                name='displayName'
                value={formState.displayName}
                onChange={handleInputChange}
              />
              <InputField
                label='Bio'
                placeholder=''
                name='bio'
                type='textarea'
                value={formState.bio}
                onChange={handleInputChange}
              />
              <InputField
                label='Profile picture URL'
                placeholder=''
                name='picture'
                inputMode='url'
                value={formState.picture}
                onChange={handleInputChange}
              />
              <InputField
                label='Banner picture URL'
                placeholder=''
                name='banner'
                inputMode='url'
                value={formState.banner}
                onChange={handleInputChange}
              />
              <InputField
                label='Nip-05 address'
                placeholder=''
                name='nip05'
                value={formState.nip05}
                onChange={handleInputChange}
              />
              <InputField
                label='Lightning Address (lud16)'
                placeholder=''
                name='lud16'
                value={formState.lud16}
                onChange={handleInputChange}
              />
            </div>
            <div
              className='IBMSMSMBSS_ProfileActions'
              style={{
                padding: 'unset',
                border: 'unset',
                justifyContent: 'end'
              }}
            >
              <button
                className='btn btnMain'
                type='button'
                disabled={isPublishing}
                onClick={handlePublish}
              >
                Publish Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
