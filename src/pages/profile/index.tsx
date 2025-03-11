import {
  NDKEvent,
  NDKFilter,
  NDKKind,
  NDKSubscription,
  NDKSubscriptionCacheUsage
} from '@nostr-dev-kit/ndk'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ModCard } from 'components/ModCard'
import { ModFilter } from 'components/Filters/ModsFilter'
import { Pagination } from 'components/Pagination'
import { ProfileSection } from 'components/ProfileSection'
import { Tabs } from 'components/Tabs'
import {
  MOD_FILTER_LIMIT,
  PROFILE_BLOG_FILTER_LIMIT,
  T_TAG_VALUE
} from '../../constants'
import {
  useAppSelector,
  useFilteredMods,
  useLocalStorage,
  useNDKContext
} from 'hooks'
import { kinds, UnsignedEvent } from 'nostr-tools'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLoaderData, useNavigation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { appRoutes } from 'routes'
import {
  BlogCardDetails,
  FeedPostsFilter,
  FilterOptions,
  ModDetails,
  ModeratedFilter,
  NSFWFilter,
  RepostFilter,
  SortBy,
  UserRelaysType
} from 'types'
import {
  copyTextToClipboard,
  DEFAULT_FILTER_OPTIONS,
  extractBlogCardDetails,
  extractModData,
  isModDataComplete,
  log,
  LogType,
  now,
  npubToHex,
  sendDMUsingRandomKey,
  signAndPublish
} from 'utils'
import { CheckboxField } from 'components/Inputs'
import { ProfilePageLoaderResult } from './loader'
import { BlogCard } from 'components/BlogCard'
import { BlogsFilter } from 'components/Filters/BlogsFilter'
import { FeedFilter } from 'components/Filters/FeedFilter'
import { Note } from 'components/Notes/Note'
import { FetchModsOptions } from 'contexts/NDKContext'

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

type ReportUserPopupProps = {
  reportedPubkey: string
  handleClose: () => void
}

const USER_REPORT_REASONS = [
  { label: `User posts actual CP`, key: 'user_actuallyCP' },
  { label: `User is a spammer`, key: 'user_spam' },
  { label: `User is a scammer`, key: 'user_scam' },
  { label: `User posts malware`, key: 'user_malware' },
  { label: `User posts non-mods`, key: 'user_notAGameMod' },
  { label: `User doesn't tag NSFW`, key: 'user_wasntTaggedNSFW' },
  { label: `Other (user)`, key: 'user_otherReason' }
]

const ReportUserPopup = ({
  reportedPubkey,
  handleClose
}: ReportUserPopupProps) => {
  const { ndk, fetchEventFromUserRelays, publish } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [selectedOptions, setSelectedOptions] = useState(
    USER_REPORT_REASONS.reduce((acc: { [key: string]: boolean }, cur) => {
      acc[cur.key] = false
      return acc
    }, {})
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')

  const handleCheckboxChange = (option: keyof typeof selectedOptions) => {
    setSelectedOptions((prevState) => ({
      ...prevState,
      [option]: !prevState[option]
    }))
  }

  const handleSubmit = async () => {
    const selectedOptionsCount = Object.values(selectedOptions).filter(
      (isSelected) => isSelected
    ).length

    if (selectedOptionsCount === 0) {
      toast.error('At least one option should be checked!')
      return
    }

    setIsLoading(true)
    setLoadingSpinnerDesc('Getting user pubkey')
    let userHexKey: string | undefined
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
      toast.error('Could not get pubkey for reporting user!')
      setIsLoading(false)
      return
    }

    const reportingNpub = import.meta.env.VITE_REPORTING_NPUB
    const reportingPubkey = npubToHex(reportingNpub)

    if (reportingPubkey === userHexKey) {
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
            (item) => item[0] === 'p' && item[1] === reportedPubkey
          ) !== -1

        if (alreadyExists) {
          setIsLoading(false)
          return toast.warn(
            `Reporter user's pubkey is already in the mute list`
          )
        }

        tags.push(['p', reportedPubkey])

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
          tags: [['p', reportedPubkey]]
        }
      }

      setLoadingSpinnerDesc('Updating mute list event')
      const isUpdated = await signAndPublish(unsignedEvent, ndk, publish)
      if (isUpdated) handleClose()
    } else {
      const href = window.location.href
      let message = `I'd like to report ${href} due to following reasons:\n`

      Object.entries(selectedOptions).forEach(([key, value]) => {
        if (value) {
          message += `* ${key}\n`
        }
      })

      setLoadingSpinnerDesc('Sending report')
      const isSent = await sendDMUsingRandomKey(
        message,
        reportingPubkey!,
        ndk,
        publish
      )
      if (isSent) handleClose()
    }
    setIsLoading(false)
  }

  return (
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}
      <div className='popUpMain'>
        <div className='ContainerMain'>
          <div className='popUpMainCardWrapper'>
            <div className='popUpMainCard popUpMainCardQR'>
              <div className='popUpMainCardTop'>
                <div className='popUpMainCardTopInfo'>
                  <h3>Report Post</h3>
                </div>
                <div className='popUpMainCardTopClose' onClick={handleClose}>
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
              <div className='pUMCB_Zaps'>
                <div className='pUMCB_ZapsInside'>
                  <div className='inputLabelWrapperMain'>
                    <label
                      className='form-label labelMain'
                      style={{ fontWeight: 'bold' }}
                    >
                      Why are you reporting the user?
                    </label>
                    {USER_REPORT_REASONS.map((r) => (
                      <CheckboxField
                        key={r.key}
                        label={r.label}
                        name={r.key}
                        isChecked={selectedOptions[r.key]}
                        handleChange={() => handleCheckboxChange(r.key)}
                      />
                    ))}
                    <button
                      className='btn btnMain pUMCB_Report'
                      type='button'
                      style={{ width: '100%' }}
                      onClick={handleSubmit}
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const ProfileTabMods = () => {
  const { profilePubkey, repostList, muteLists, nsfwList } =
    useLoaderData() as ProfilePageLoaderResult
  const { ndk, fetchMods } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingSpinnerDesc, setLoadingSpinnerDesc] = useState('')
  const [mods, setMods] = useState<ModDetails[]>([])
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(false)
  const filterKey = 'filter-profile'
  const [filterOptions] = useLocalStorage<FilterOptions>(filterKey, {
    ...DEFAULT_FILTER_OPTIONS
  })
  const lastMod: ModDetails | undefined = useMemo(() => {
    // For the latest sort find oldest mod
    // for the oldest sort find newest mod
    return mods.reduce((prev, current) => {
      if (!prev) return current
      if (filterOptions.sort === SortBy.Latest) {
        return current.edited_at < prev.edited_at ? current : prev
      } else if (filterOptions.sort === SortBy.Oldest) {
        return current.edited_at > prev.edited_at ? current : prev
      }
      return prev
    }, undefined as ModDetails | undefined)
  }, [mods, filterOptions.sort])
  useEffect(() => {
    setIsLoading(true)
    setLoadingSpinnerDesc('Fetching mods..')
    fetchMods({ source: filterOptions.source, author: profilePubkey })
      .then((res) => {
        if (filterOptions.sort === SortBy.Latest) {
          res.sort((a, b) => b.published_at - a.published_at)
        } else if (filterOptions.sort === SortBy.Oldest) {
          res.sort((a, b) => a.published_at - b.published_at)
        }
        setIsLoadMoreVisible(res.length >= MOD_FILTER_LIMIT)
        setMods(res.slice(0, MOD_FILTER_LIMIT))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [fetchMods, filterOptions.sort, filterOptions.source, profilePubkey])

  const handleLoadMore = useCallback(() => {
    setIsLoading(true)

    const fetchModsOptions: FetchModsOptions = {
      source: filterOptions.source,
      author: profilePubkey
    }

    if (lastMod) {
      if (filterOptions.sort === SortBy.Latest) {
        fetchModsOptions.until = lastMod.edited_at - 1
      } else if (filterOptions.sort === SortBy.Oldest) {
        fetchModsOptions.since = lastMod.edited_at + 1
      }
    }

    fetchMods(fetchModsOptions)
      .then((res) => {
        setMods((prevMods) => {
          const newMods = res
          const combinedMods = [...prevMods, ...newMods]
          const uniqueMods = Array.from(
            new Set(combinedMods.map((mod) => mod.id))
          )
            .map((id) => combinedMods.find((mod) => mod.id === id))
            .filter((mod): mod is ModDetails => mod !== undefined)

          setIsLoadMoreVisible(newMods.length >= MOD_FILTER_LIMIT)

          return uniqueMods
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [
    fetchMods,
    filterOptions.sort,
    filterOptions.source,
    lastMod,
    profilePubkey
  ])

  // Add missing mods to the list
  useEffect(() => {
    let sub: NDKSubscription
    if (lastMod && profilePubkey) {
      const filter: NDKFilter = {
        kinds: [NDKKind.Classified],
        '#t': [T_TAG_VALUE],
        authors: [profilePubkey]
      }
      if (filterOptions.sort === SortBy.Latest) {
        filter.since = lastMod.edited_at + 1
      } else if (filterOptions.sort === SortBy.Oldest) {
        filter.until = lastMod.edited_at - 1
      }
      if (filterOptions.source === window.location.host) {
        filter['#r'] = [window.location.host]
      }
      sub = ndk.subscribe(
        filter,
        {
          closeOnEose: false,
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL
        },
        undefined,
        {
          onEvent: (ndkEvent) => {
            setMods((prevMods) => {
              // Skip if not valid
              if (!isModDataComplete(ndkEvent)) {
                return prevMods
              }

              // Skip existing
              if (
                prevMods.find(
                  (e) =>
                    e.id === ndkEvent.id ||
                    prevMods.findIndex((n) => n.id === ndkEvent.id) !== -1
                )
              ) {
                return prevMods
              }
              const newMod = extractModData(ndkEvent)
              return [...prevMods, newMod]
            })
          }
        }
      )
    }
    return () => {
      if (sub) sub.stop()
    }
  }, [filterOptions.sort, filterOptions.source, lastMod, ndk, profilePubkey])

  const filteredModList = useFilteredMods(
    mods,
    userState,
    filterOptions,
    nsfwList,
    muteLists,
    repostList,
    profilePubkey
  )

  return (
    <>
      {isLoading && <LoadingSpinner desc={loadingSpinnerDesc} />}

      <ModFilter filterKey={filterKey} author={profilePubkey} />

      <div className='IBMSMList IBMSMListAlt'>
        {filteredModList.map((mod) => (
          <ModCard key={mod.id} {...mod} />
        ))}
      </div>

      {!isLoading && isLoadMoreVisible && filteredModList.length > 0 && (
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

const ProfileTabBlogs = () => {
  const { profilePubkey, muteLists, nsfwList } =
    useLoaderData() as ProfilePageLoaderResult
  const navigation = useNavigation()
  const { fetchEvents } = useNDKContext()
  const [filterOptions] = useLocalStorage('filter-blog', DEFAULT_FILTER_OPTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const blogfilter: NDKFilter = useMemo(() => {
    const filter: NDKFilter = {
      authors: [profilePubkey],
      kinds: [kinds.LongFormArticle]
    }

    const host = window.location.host
    if (filterOptions.source === host) {
      filter['#r'] = [host]
    }

    if (filterOptions.nsfw === NSFWFilter.Only_NSFW) {
      filter['#L'] = ['content-warning']
    }

    return filter
  }, [filterOptions.nsfw, filterOptions.source, profilePubkey])

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [blogs, setBlogs] = useState<Partial<BlogCardDetails>[]>([])
  useEffect(() => {
    if (profilePubkey) {
      // Initial blog fetch, go beyond limit to check for next
      const filter: NDKFilter = {
        ...blogfilter,
        limit: PROFILE_BLOG_FILTER_LIMIT + 1
      }
      fetchEvents(filter)
        .then((events) => {
          setBlogs(events.map(extractBlogCardDetails).filter((b) => b.naddr))
          setHasMore(events.length > PROFILE_BLOG_FILTER_LIMIT)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [blogfilter, fetchEvents, profilePubkey])

  const handleNext = useCallback(() => {
    if (isLoading) return

    const last = blogs.length > 0 ? blogs[blogs.length - 1] : undefined
    if (last?.published_at) {
      const until = last?.published_at - 1
      const nextFilter = {
        ...blogfilter,
        limit: PROFILE_BLOG_FILTER_LIMIT + 1,
        until
      }
      setIsLoading(true)
      fetchEvents(nextFilter)
        .then((events) => {
          const nextBlogs = events.map(extractBlogCardDetails)
          setHasMore(nextBlogs.length > PROFILE_BLOG_FILTER_LIMIT)
          setPage((prev) => prev + 1)
          setBlogs(
            nextBlogs.slice(0, PROFILE_BLOG_FILTER_LIMIT).filter((b) => b.naddr)
          )
        })
        .finally(() => setIsLoading(false))
    }
  }, [blogfilter, blogs, fetchEvents, isLoading])

  const handlePrev = useCallback(() => {
    if (isLoading) return

    const first = blogs.length > 0 ? blogs[0] : undefined
    if (first?.published_at) {
      const since = first.published_at + 1
      const prevFilter = {
        ...blogfilter,
        limit: PROFILE_BLOG_FILTER_LIMIT,
        since
      }
      setIsLoading(true)
      fetchEvents(prevFilter)
        .then((events) => {
          setHasMore(true)
          setPage((prev) => prev - 1)
          setBlogs(events.map(extractBlogCardDetails).filter((b) => b.naddr))
        })
        .finally(() => setIsLoading(false))
    }
  }, [blogfilter, blogs, fetchEvents, isLoading])

  const userState = useAppSelector((state) => state.user)
  const moderatedAndSortedBlogs = useMemo(() => {
    let _blogs = blogs || []
    const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
    const isOwner =
      userState.user?.pubkey && userState.user.pubkey === profilePubkey
    const isUnmoderatedFully =
      filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
    const isOnlyBlocked =
      filterOptions.moderated === ModeratedFilter.Only_Blocked

    // Add nsfw tag to blogs included in nsfwList
    if (filterOptions.nsfw !== NSFWFilter.Hide_NSFW) {
      _blogs = _blogs.map((b) => {
        return !b.nsfw && b.aTag && nsfwList.includes(b.aTag)
          ? { ...b, nsfw: true }
          : b
      })
    }

    // Filter nsfw (Hide_NSFW option)
    _blogs = _blogs.filter(
      (b) => !(b.nsfw && filterOptions.nsfw === NSFWFilter.Hide_NSFW)
    )

    if (isOnlyBlocked && isAdmin) {
      _blogs = _blogs.filter(
        (b) =>
          muteLists.admin.authors.includes(b.author!) ||
          muteLists.admin.replaceableEvents.includes(b.aTag!)
      )
    } else if (isUnmoderatedFully && (isAdmin || isOwner)) {
      // Only apply filtering if the user is not an admin or the admin has not selected "Unmoderated Fully"
      // Allow "Unmoderated Fully" when author visits own profile
    } else {
      _blogs = _blogs.filter(
        (b) =>
          !muteLists.admin.authors.includes(b.author!) &&
          !muteLists.admin.replaceableEvents.includes(b.aTag!)
      )
    }

    if (filterOptions.moderated === ModeratedFilter.Moderated) {
      _blogs = _blogs.filter(
        (b) =>
          !muteLists.user.authors.includes(b.author!) &&
          !muteLists.user.replaceableEvents.includes(b.aTag!)
      )
    }

    if (filterOptions.sort === SortBy.Latest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? b.published_at - a.published_at : 0
      )
    } else if (filterOptions.sort === SortBy.Oldest) {
      _blogs.sort((a, b) =>
        a.published_at && b.published_at ? a.published_at - b.published_at : 0
      )
    }

    return _blogs
  }, [
    blogs,
    filterOptions.moderated,
    filterOptions.nsfw,
    filterOptions.sort,
    muteLists.admin.authors,
    muteLists.admin.replaceableEvents,
    muteLists.user.authors,
    muteLists.user.replaceableEvents,
    nsfwList,
    profilePubkey,
    userState.user?.npub,
    userState.user?.pubkey
  ])

  return (
    <>
      {(isLoading || navigation.state !== 'idle') && (
        <LoadingSpinner desc={'Loading...'} />
      )}

      <BlogsFilter filterKey={'filter-blog'} author={profilePubkey} />

      <div className='IBMSMList IBMSMListAlt'>
        {moderatedAndSortedBlogs.map((b) => (
          <BlogCard key={b.id} {...b} />
        ))}
      </div>

      {!(page === 1 && !hasMore) && (
        <Pagination
          page={page}
          disabledNext={!hasMore}
          handlePrev={handlePrev}
          handleNext={handleNext}
        />
      )}
    </>
  )
}

const ProfileTabPosts = () => {
  const SHOWING_STEP = 20
  const { profilePubkey } = useLoaderData() as ProfilePageLoaderResult
  const { ndk } = useNDKContext()
  const [notes, setNotes] = useState<NDKEvent[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadMoreVisible, setIsLoadMoreVisible] = useState(true)
  const [showing, setShowing] = useState(SHOWING_STEP)

  const filterKey = 'filter-feed-2'
  const [filterOptions] = useLocalStorage<FeedPostsFilter>(
    filterKey,
    DEFAULT_FILTER_OPTIONS
  )

  useEffect(() => {
    setIsFetching(true)
    setIsLoadMoreVisible(true)

    const filter: NDKFilter = {
      authors: [profilePubkey],
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
  }, [ndk, profilePubkey])

  const filteredNotes = useMemo(() => {
    let _notes = notes || []
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

  const handleLoadMore = () => {
    const LOAD_MORE_STEP = SHOWING_STEP * 2
    setShowing((prev) => prev + SHOWING_STEP)
    const lastNote = notes[notes.length - 1]
    const filter: NDKFilter = {
      authors: [profilePubkey],
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
      <FeedFilter tab={2} />
      {isFetching && <LoadingSpinner desc='Fetching notes from relays' />}
      {filteredNotes.length === 0 && !isFetching && (
        <div className='IBMSMListFeedNoPosts'>
          <p>There are no posts to show</p>
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
