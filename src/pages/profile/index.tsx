import { NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ProfileSection } from 'components/ProfileSection'
import { Tabs } from 'components/Tabs'
import { useAppSelector, useNDKContext } from 'hooks'
import { UnsignedEvent } from 'nostr-tools'
import { useRef, useState } from 'react'
import { Link, useLoaderData } from 'react-router-dom'
import { toast } from 'react-toastify'
import { appRoutes } from 'routes'
import { UserRelaysType } from 'types'
import { copyTextToClipboard, log, LogType, now, signAndPublish } from 'utils'
import { ProfilePageLoaderResult } from './loader'
import { ProfileTabBlogs } from './ProfileTabBlogs'
import { ProfileTabPosts } from './ProfileTabPosts'
import { ProfileTabMods } from './ProfileTabMods'
import { ReportUserPopup } from './ReportUserPopup'

export const ProfilePage = () => {
  const {
    profilePubkey,
    profile,
    isBlocked: _isBlocked
  } = useLoaderData() as ProfilePageLoaderResult
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { ndk, publish, fetchEventFromUserRelays } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')

  const displayName =
    profile?.displayName || profile?.name || '[name not set up]'
  const [showReportPopUp, setShowReportPopUp] = useState(false)
  const isLoggedIn = userState.auth && userState.user?.pubkey !== 'undefined'
  const isOwnProfile =
    userState.auth &&
    userState.user?.pubkey &&
    userState.user.pubkey === profilePubkey

  const [isBlocked, setIsBlocked] = useState(_isBlocked)
  const handleBlock = async () => {
    if (!profilePubkey) {
      toast.error(`Something went wrong. Unable to find reported user's pubkey`)
      return
    }

    let userHexKey: string | undefined

    setIsLoading(true)
    setLoadingSpinnerDesc('Getting user pubkey')

    if (userState.auth && userState.user?.pubkey) {
      userHexKey = userState.user.pubkey as string
    } else {
      try {
        userHexKey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!userHexKey) {
      toast.error('Could not get pubkey for updating mute list')
      setIsLoading(false)
      return
    }

    setLoadingSpinnerDesc(`Finding user's mute list`)

    // Define the event filter to search for the user's mute list events.
    // We look for events of a specific kind (Mutelist) authored by the given hexPubkey.
    const filter: NDKFilter = {
      kinds: [NDKKind.MuteList],
      authors: [userHexKey]
    }

    // Fetch the mute list event from the relays. This returns the event containing the user's mute list.
    const muteListEvent = await fetchEventFromUserRelays(
      filter,
      userHexKey,
      UserRelaysType.Write
    )

    let unsignedEvent: UnsignedEvent

    if (muteListEvent) {
      // get a list of tags
      const tags = muteListEvent.tags
      const alreadyExists =
        tags.findIndex(
          (item) => item[0] === 'p' && item[1] === profilePubkey
        ) !== -1

      if (alreadyExists) {
        setIsLoading(false)
        setIsBlocked(true)
        return toast.warn(`User is already in the mute list`)
      }

      tags.push(['p', profilePubkey])

      unsignedEvent = {
        pubkey: muteListEvent.pubkey,
        kind: NDKKind.MuteList,
        content: muteListEvent.content,
        created_at: now(),
        tags: [...tags]
      }
    } else {
      unsignedEvent = {
        pubkey: userHexKey,
        kind: NDKKind.MuteList,
        content: '',
        created_at: now(),
        tags: [['p', profilePubkey]]
      }
    }

    setLoadingSpinnerDesc('Updating mute list event')

    const isUpdated = await signAndPublish(unsignedEvent, ndk, publish)
    if (isUpdated) {
      setIsBlocked(true)
    }
    setIsLoading(false)
  }

  const handleUnblock = async () => {
    if (!profilePubkey) {
      toast.error(`Something went wrong. Unable to find reported user's pubkey`)
      return
    }

    const userHexKey = userState.user?.pubkey as string

    const filter: NDKFilter = {
      kinds: [NDKKind.MuteList],
      authors: [userHexKey]
    }

    setIsLoading(true)
    setLoadingSpinnerDesc(`Finding user's mute list`)

    // Fetch the mute list event from the relays. This returns the event containing the user's mute list.
    const muteListEvent = await fetchEventFromUserRelays(
      filter,
      userHexKey,
      UserRelaysType.Write
    )

    if (!muteListEvent) {
      toast.error(`Couldn't get user's mute list event from relays`)
      return
    }

    const tags = muteListEvent.tags

    const unsignedEvent: UnsignedEvent = {
      pubkey: muteListEvent.pubkey,
      kind: NDKKind.MuteList,
      content: muteListEvent.content,
      created_at: now(),
      tags: tags.filter((item) => item[0] !== 'p' || item[1] !== profilePubkey)
    }

    setLoadingSpinnerDesc('Updating mute list event')
    const isUpdated = await signAndPublish(unsignedEvent, ndk, publish)
    if (isUpdated) {
      setIsBlocked(false)
    }

    setIsLoading(false)
  }

  // Tabs
  const [tab, setTab] = useState(0)

  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div
          className='IBMSecMainGroup IBMSecMainGroupAlt'
          ref={scrollTargetRef}
        >
          <div className='IBMSMSplitMain'>
            <div className='IBMSMSplitMainBigSide'>
              <div className='IBMSMSplitMainBigSideSec'>
                <div className='IBMSMSMBSS_Profile'>
                  <div className='IBMSMSMBSSModFor'>
                    {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
                    <p className='IBMSMSMBSSModForPara'>{displayName}'s Page</p>
                    <div
                      className='dropdown dropdownMain'
                      style={{ flexGrow: 'unset' }}
                    >
                      <button
                        className='btn btnMain btnMainDropdown'
                        aria-expanded='false'
                        data-bs-toggle='dropdown'
                        type='button'
                        style={{
                          borderRadius: '5px',
                          background: 'unset',
                          padding: '5px'
                        }}
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          viewBox='-192 0 512 512'
                          width='1em'
                          height='1em'
                          fill='currentColor'
                        >
                          <path d='M64 360C94.93 360 120 385.1 120 416C120 446.9 94.93 472 64 472C33.07 472 8 446.9 8 416C8 385.1 33.07 360 64 360zM64 200C94.93 200 120 225.1 120 256C120 286.9 94.93 312 64 312C33.07 312 8 286.9 8 256C8 225.1 33.07 200 64 200zM64 152C33.07 152 8 126.9 8 96C8 65.07 33.07 40 64 40C94.93 40 120 65.07 120 96C120 126.9 94.93 152 64 152z'></path>
                        </svg>
                      </button>
                      <div className='dropdown-menu dropdown-menu-end dropdownMainMenu'>
                        {isOwnProfile && (
                          <Link
                            className='dropdown-item dropdownMainMenuItem'
                            to={appRoutes.settingsProfile}
                          >
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              viewBox='0 0 512 512'
                              width='1em'
                              height='1em'
                              fill='currentColor'
                              className='IBMSMSMSSS_Author_Top_Icon'
                            >
                              <path d='M362.7 19.32C387.7-5.678 428.3-5.678 453.3 19.32L492.7 58.75C517.7 83.74 517.7 124.3 492.7 149.3L444.3 197.7L314.3 67.72L362.7 19.32zM421.7 220.3L188.5 453.4C178.1 463.8 165.2 471.5 151.1 475.6L30.77 511C22.35 513.5 13.24 511.2 7.03 504.1C.8198 498.8-1.502 489.7 .976 481.2L36.37 360.9C40.53 346.8 48.16 333.9 58.57 323.5L291.7 90.34L421.7 220.3z'></path>
                            </svg>
                            Edit
                          </Link>
                        )}
                        <a
                          className='dropdown-item dropdownMainMenuItem'
                          onClick={() => {
                            copyTextToClipboard(window.location.href).then(
                              (isCopied) => {
                                if (isCopied)
                                  toast.success('Url copied to clipboard!')
                              }
                            )
                          }}
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
                          Copy URL
                        </a>
                        <a
                          className='dropdown-item dropdownMainMenuItem'
                          href='#'
                        >
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 512 512'
                            width='1em'
                            height='1em'
                            fill='currentColor'
                            className='IBMSMSMSSS_Author_Top_Icon'
                          >
                            <path d='M503.7 226.2l-176 151.1c-15.38 13.3-39.69 2.545-39.69-18.16V272.1C132.9 274.3 66.06 312.8 111.4 457.8c5.031 16.09-14.41 28.56-28.06 18.62C39.59 444.6 0 383.8 0 322.3c0-152.2 127.4-184.4 288-186.3V56.02c0-20.67 24.28-31.46 39.69-18.16l176 151.1C514.8 199.4 514.8 216.6 503.7 226.2z'></path>
                          </svg>
                          Share
                        </a>
                        {!isOwnProfile && (
                          <>
                            {isLoggedIn && (
                              <a
                                className='dropdown-item dropdownMainMenuItem'
                                id='reportUser'
                                onClick={() => setShowReportPopUp(true)}
                              >
                                <svg
                                  xmlns='http://www.w3.org/2000/svg'
                                  viewBox='0 0 512 512'
                                  width='1em'
                                  height='1em'
                                  fill='currentColor'
                                  className='IBMSMSMSSS_Author_Top_Icon'
                                >
                                  <path d='M506.3 417l-213.3-364c-16.33-28-57.54-28-73.98 0l-213.2 364C-10.59 444.9 9.849 480 42.74 480h426.6C502.1 480 522.6 445 506.3 417zM232 168c0-13.25 10.75-24 24-24S280 154.8 280 168v128c0 13.25-10.75 24-23.1 24S232 309.3 232 296V168zM256 416c-17.36 0-31.44-14.08-31.44-31.44c0-17.36 14.07-31.44 31.44-31.44s31.44 14.08 31.44 31.44C287.4 401.9 273.4 416 256 416z'></path>
                                </svg>
                                Report
                              </a>
                            )}
                            <a
                              className='dropdown-item dropdownMainMenuItem'
                              onClick={isBlocked ? handleUnblock : handleBlock}
                            >
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                viewBox='-32 0 512 512'
                                width='1em'
                                height='1em'
                                fill='currentColor'
                                className='IBMSMSMSSS_Author_Top_Icon'
                              >
                                <path d='M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 72.74-130.8c7 8 98.88 125.4 98.88 125.4l58.63-66.88c4.125 6.75 7.867 13.52 11.24 19.9C364.9 290.6 353.4 357.4 304.1 391.9z'></path>
                              </svg>
                              {isBlocked ? 'Unblock' : 'Block User'}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Tabs
                    tabs={['Mods', 'Blogs', 'Posts']}
                    tab={tab}
                    setTab={setTab}
                  />

                  {/* Tabs Content */}
                  {tab === 0 && <ProfileTabMods />}
                  {tab === 1 && <ProfileTabBlogs />}
                  {tab === 2 && <ProfileTabPosts />}
                </div>
              </div>
            </div>
            <ProfileSection pubkey={profilePubkey} />
          </div>
        </div>
        {showReportPopUp && (
          <ReportUserPopup
            reportedPubkey={profilePubkey}
            handleClose={() => setShowReportPopUp(false)}
          />
        )}
      </div>
    </div>
  )
}
