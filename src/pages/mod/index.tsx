import FsLightbox from 'fslightbox-react'
import { nip19 } from 'nostr-tools'
import { useEffect, useRef, useState } from 'react'
import {
  Outlet,
  Link as ReactRouterLink,
  useLoaderData,
  useNavigate,
  useNavigation,
  useParams,
  useSubmit
} from 'react-router-dom'
import { toast } from 'react-toastify'
import { BlogCard } from '../../components/BlogCard'
import { ProfileSection } from '../../components/ProfileSection'
import {
  useAppSelector,
  useBodyScrollDisable,
  useDidMount,
  useLocalStorage,
  useNDKContext,
  useBlossomList,
  useCommentUsersBlossomList,
  useImageFallback
} from '../../hooks'
import { useComments } from '../../hooks/useComments'
import { appRoutes, getGamePageRoute, getModsEditPageRoute } from '../../routes'
import '../../styles/comments.css'
import '../../styles/downloads.css'
import '../../styles/innerPage.css'
import '../../styles/popup.css'
import '../../styles/post.css'
import '../../styles/reactions.css'
import '../../styles/styles.css'
import '../../styles/tabs.css'
import '../../styles/tags.css'
import '../../styles/write.css'
import {
  DownloadUrl,
  ModDetails,
  ModFormState,
  ModPageLoaderResult,
  ModPermissions,
  MODPERMISSIONS_CONF,
  MODPERMISSIONS_DESC
} from '../../types'
import { UserBlossom } from '../../hooks/useUserBlossomList'
import {
  capitalizeEachWord,
  checkUrlForFile,
  copyTextToClipboard,
  getFilenameFromUrl,
  isValidUrl,
  log,
  findAllDownloadUrls,
  downloadFileWithFallback,
  LogType,
  getUniqueCommenterBlossomServers
} from '../../utils'
import { Comments } from '../../components/comment'
import { PublishDetails } from 'components/Internal/PublishDetails'
import { Interactions } from 'components/Internal/Interactions'
import { ReportPopup } from 'components/ReportPopup'
import { Spinner } from 'components/Spinner'
import { RouterLoadingSpinner } from 'components/LoadingSpinner'
import { OriginalAuthor } from 'components/OriginalAuthor'
import { Viewer } from 'components/Markdown/Viewer'
import { PostWarnings } from 'components/PostWarning'
import { DownloadDetailsPopup } from 'components/DownloadDetailsPopup'
import { HashVerificationPopup } from 'components/HashVerificationPopup'
import { NsfwAlertPopup } from 'components/NsfwAlertPopup'
import { ImageWithFallback } from 'components/ImageWithFallback'
import useModData from './useModData'
import { AlertPopup } from 'components/AlertPopup'
import { useDeleted } from 'hooks/useDeleted'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk'
import { useDeletedBlogs } from 'hooks/useDeletedBlogs'
import { ServerService } from 'controllers/server'
import { HardBlockedContent } from 'components/HardBlockedContent'

const MOD_REPORT_REASONS = [
  { label: 'Actually CP', key: 'actuallyCP' },
  { label: 'Spam', key: 'spam' },
  { label: 'Scam', key: 'scam' },
  { label: 'Not a game mod', key: 'notAGameMod' },
  { label: 'Stolen game mod', key: 'stolenGameMod' },
  { label: `Repost of a game mod`, key: 'repost' },
  { label: `Wasn't tagged NSFW`, key: 'wasntTaggedNSFW' },
  { label: 'Other reason', key: 'otherReason' }
]

export const ModPage = () => {
  const { mod: mod, postWarning } = useModData()

  // We can get author right away from naddr, no need to wait for mod data
  const { naddr, nevent } = useParams()
  let author = mod?.author
  if (naddr && !author) {
    try {
      const decoded = nip19.decode<'naddr'>(naddr as `naddr1${string}`)
      author = decoded.data.pubkey
    } catch (error) {
      // Silently ignore - we will get author eventually from mods
    }
  }

  const [commentCount, setCommentCount] = useState(0)
  const { commentEvents } = useComments(mod?.author, mod?.aTag)
  const { allServers: commenterBlossomServers } =
    useCommentUsersBlossomList(commentEvents)
  const { isDeleted, loading: isDeletionLoading } = useDeleted(
    mod?.id,
    mod?.author
  )

  const navigate = useNavigate()
  const [confirmNsfw] = useLocalStorage<boolean>('confirm-nsfw', false)
  const [showNsfwPopup, setShowNsfwPopup] = useState<boolean>(
    (mod?.nsfw ?? false) && !confirmNsfw
  )
  const handleConfirm = (confirm: boolean) => {
    if (!confirm) {
      navigate(appRoutes.home)
    }
  }

  // Check if the post is hard blocked
  const { isHardBlocked, hardBlockedType } =
    useLoaderData() as ModPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

  return (
    <>
      <RouterLoadingSpinner />
      <div className="InnerBodyMain">
        <div className="ContainerMain">
          <div className="IBMSecMainGroup IBMSecMainGroupAlt">
            <div className="IBMSMSplitMain">
              <div className="IBMSMSplitMainBigSide">
                {mod ? (
                  <>
                    {isDeletionLoading ? (
                      <LoadingSpinner desc="Checking deletion status" />
                    ) : isDeleted ? (
                      <p
                        className="text-muted d-flex align-items-end justify-content-center"
                        style={{
                          fontStyle: 'italic',
                          minHeight: '100px',
                          width: '100%',
                          marginBottom: '20px'
                        }}
                      >
                        This mod post has been deleted by its author
                      </p>
                    ) : isHardBlocked && !isAdmin ? (
                      <HardBlockedContent hardBlockedType={hardBlockedType} />
                    ) : (
                      <>
                        <div className="IBMSMSplitMainBigSideSec">
                          <Game />
                          {postWarning && (
                            <PostWarnings
                              type={postWarning}
                              isHardBlocked={isHardBlocked}
                              hardBlockedType={hardBlockedType}
                            />
                          )}
                          <Body {...mod} />
                          <Interactions
                            addressable={mod}
                            commentCount={commentCount}
                          />
                          <PublishDetails
                            published_at={mod.published_at}
                            edited_at={mod.edited_at}
                            site={mod.rTag}
                          />
                        </div>
                        <div className="IBMSMSplitMainBigSideSec">
                          <div className="IBMSMSMBSSDownloadsWrapper">
                            <h4 className="IBMSMSMBSSDownloadsTitle">
                              Mod Download
                            </h4>
                            {postWarning && (
                              <PostWarnings
                                type={postWarning}
                                isHardBlocked={isHardBlocked}
                                hardBlockedType={hardBlockedType}
                              />
                            )}
                            {mod.downloadUrls.length > 0 && (
                              <div className="IBMSMSMBSSDownloadsPrime">
                                <Download
                                  {...mod.downloadUrls[0]}
                                  commenterBlossomServers={
                                    commenterBlossomServers
                                  }
                                />
                              </div>
                            )}
                            {mod.downloadUrls.length > 1 && (
                              <div className="IBMSMSMBSSDownloads">
                                {mod.downloadUrls
                                  .slice(1)
                                  .map((download, index) => (
                                    <Download
                                      key={`downloadUrl-${index}`}
                                      {...download}
                                      commenterBlossomServers={
                                        commenterBlossomServers
                                      }
                                    />
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <DisplayModAuthorBlogs />
                        <div className="IBMSMSplitMainBigSideSec">
                          <Comments
                            addressable={mod}
                            setCommentCount={setCommentCount}
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <Spinner />
                )}
              </div>
              {typeof author !== 'undefined' && (!isHardBlocked || isAdmin) && (
                <ProfileSection pubkey={author} />
              )}
              <Outlet key={nevent} />
              {showNsfwPopup && (
                <NsfwAlertPopup
                  handleConfirm={handleConfirm}
                  handleClose={() => setShowNsfwPopup(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const Game = () => {
  const { naddr } = useParams()
  const navigation = useNavigation()
  const {
    mod,
    isAddedToNSFW,
    isBlocked,
    isRepost,
    isHardBlocked,
    hardBlockedType
  } = useLoaderData() as ModPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const { ndk } = useNDKContext()
  const isLoggedIn = userState.auth && userState.user?.pubkey !== 'undefined'
  const [showReportPopUp, setShowReportPopUp] = useState<number | undefined>()
  const [showDeletePopup, setShowDeletePopup] = useState<boolean>(false)

  useBodyScrollDisable(!!showReportPopUp || showDeletePopup)

  const submit = useSubmit()
  const handleBlock = () => {
    if (navigation.state === 'idle') {
      submit(
        {
          intent: 'block',
          value: !isBlocked
        },
        {
          method: 'post',
          encType: 'application/json'
        }
      )
    }
  }

  const handleNSFW = () => {
    if (navigation.state === 'idle') {
      submit(
        {
          intent: 'nsfw',
          value: !isAddedToNSFW
        },
        {
          method: 'post',
          encType: 'application/json'
        }
      )
    }
  }

  const handleRepost = () => {
    if (navigation.state === 'idle') {
      submit(
        {
          intent: 'repost',
          value: !isRepost
        },
        {
          method: 'post',
          encType: 'application/json'
        }
      )
    }
  }

  const handleHardBlock = () => {
    if (navigation.state === 'idle') {
      submit(
        {
          intent: 'hardblock',
          value: !(isHardBlocked && hardBlockedType === 'post')
        },
        {
          method: 'post',
          encType: 'application/json'
        }
      )
    }
  }

  const handleDelete = async (confirm: boolean) => {
    if (navigation.state !== 'idle') return
    setShowDeletePopup(false)

    if (!confirm || !mod?.id || !mod?.aTag) return

    try {
      const deletionEvent = new NDKEvent(ndk)
      deletionEvent.kind = 5 // Deletion event kind
      deletionEvent.content = 'Requesting deletion of mod post'
      deletionEvent.tags = [
        ['e', mod.id], // Reference to the mod event being deleted
        ['a', mod.aTag] // Include addressable event tag
      ]

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
          action: `?index`
        }
      )

      // 3 seconds delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Send server delete request
      const serverService = ServerService.getInstance()
      try {
        await serverService.delete(mod.id)
      } catch (error) {
        console.warn('Failed to send server delete request:', error)
      }
    } catch (error) {
      toast.error('Failed to request mod deletion')
      log(true, LogType.Error, 'Failed to request mod deletion', error)
    }
  }

  const isAdmin =
    userState.user?.npub &&
    userState.user.npub === import.meta.env.VITE_REPORTING_NPUB

  const game = mod?.game || ''
  const gameRoute = getGamePageRoute(game)
  const editRoute = getModsEditPageRoute(naddr ? naddr : '')

  return (
    <>
      <div className="IBMSMSMBSSModFor">
        <p className="IBMSMSMBSSModForPara">
          Mod for:&nbsp;
          <ReactRouterLink className="IBMSMSMBSSModForLink" to={gameRoute}>
            {game}
          </ReactRouterLink>
        </p>
        <div className="dropdown dropdownMain" style={{ flexGrow: 'unset' }}>
          <button
            className="btn btnMain btnMainDropdown"
            aria-expanded="false"
            data-bs-toggle="dropdown"
            type="button"
            style={{
              borderRadius: '5px',
              background: 'unset',
              padding: '5px'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="-192 0 512 512"
              width="1em"
              height="1em"
              fill="currentColor"
            >
              <path d="M64 360C94.93 360 120 385.1 120 416C120 446.9 94.93 472 64 472C33.07 472 8 446.9 8 416C8 385.1 33.07 360 64 360zM64 200C94.93 200 120 225.1 120 256C120 286.9 94.93 312 64 312C33.07 312 8 286.9 8 256C8 225.1 33.07 200 64 200zM64 152C33.07 152 8 126.9 8 96C8 65.07 33.07 40 64 40C94.93 40 120 65.07 120 96C120 126.9 94.93 152 64 152z"></path>
            </svg>
          </button>
          <div
            className={`dropdown-menu dropdown-menu-end dropdownMainMenu`}
            style={{ minWidth: '220px' }}
          >
            {userState.auth && userState.user?.pubkey === mod?.author && (
              <>
                <ReactRouterLink
                  className="dropdown-item dropdownMainMenuItem"
                  to={editRoute}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMSSS_Author_Top_Icon"
                  >
                    <path d="M362.7 19.32C387.7-5.678 428.3-5.678 453.3 19.32L492.7 58.75C517.7 83.74 517.7 124.3 492.7 149.3L444.3 197.7L314.3 67.72L362.7 19.32zM421.7 220.3L188.5 453.4C178.1 463.8 165.2 471.5 151.1 475.6L30.77 511C22.35 513.5 13.24 511.2 7.03 504.1C.8198 498.8-1.502 489.7 .976 481.2L36.37 360.9C40.53 346.8 48.16 333.9 58.57 323.5L291.7 90.34L421.7 220.3z"></path>
                  </svg>
                  Edit
                </ReactRouterLink>
                <a
                  className="dropdown-item dropdownMainMenuItem"
                  style={{ color: 'rgba(255, 70, 70, 0.65)' }}
                  onClick={() => setShowDeletePopup(true)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMSSS_Author_Top_Icon"
                  >
                    <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H348.2C360.3 0 371.4 6.848 376.8 17.69L394.8 51.2C399.1 60.1 399.1 70.7 394.8 79.6L376.8 113.1C371.4 123.9 360.3 130.8 348.2 130.8H163.8C151.7 130.8 140.6 123.9 135.2 113.1L117.2 79.6C112.9 70.7 112.9 60.1 117.2 51.2L135.2 17.69zM0 96C0 78.33 14.33 64 32 64H480C497.7 64 512 78.33 512 96C512 113.7 497.7 128 480 128H32C14.33 128 0 113.7 0 96zM80 160C71.16 160 64 167.2 64 176V448C64 483.3 92.65 512 128 512H384C419.3 512 448 483.3 448 448V176C448 167.2 440.8 160 432 160H80zM144 240C144 231.2 151.2 224 160 224H352C360.8 224 368 231.2 368 240C368 248.8 360.8 256 352 256H160C151.2 256 144 248.8 144 240zM144 320C144 311.2 151.2 304 160 304H352C360.8 304 368 311.2 368 320C368 328.8 360.8 336 352 336H160C151.2 336 144 328.8 144 320zM144 400C144 391.2 151.2 384 160 384H352C360.8 384 368 391.2 368 400C368 408.8 360.8 416 352 416H160C151.2 416 144 408.8 144 400z"></path>
                  </svg>
                  Request Deletion
                </a>
              </>
            )}

            <a
              className="dropdown-item dropdownMainMenuItem"
              onClick={() => {
                copyTextToClipboard(window.location.href).then((isCopied) => {
                  if (isCopied) toast.success('Url copied to clipboard!')
                })
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                width="1em"
                height="1em"
                fill="currentColor"
                className="IBMSMSMSSS_Author_Top_Icon"
              >
                <path d="M272.1 204.2v71.1c0 1.8-1.4 3.2-3.2 3.2h-11.4c-1.1 0-2.1-.6-2.6-1.3l-32.6-44v42.2c0 1.8-1.4 3.2-3.2 3.2h-11.4c-1.8 0-3.2-1.4-3.2-3.2v-71.1c0-1.8 1.4-3.2 3.2-3.2h11.4c1.1 0 2.1.6 2.6 1.3l32.6 44v-42.2c0-1.8 1.4-3.2 3.2-3.2h11.4c1.8-.1 3.2 1.3 3.2 3.2zm-82-3.2h-11.4c-1.8 0-3.2 1.4-3.2 3.2v71.1c0 1.8 1.4 3.2 3.2 3.2h11.4c1.8 0 3.2-1.4 3.2-3.2v-71.1c0-1.7-1.4-3.2-3.2-3.2zm-27.5 59.6h-31.1v-56.4c0-1.8-1.4-3.2-3.2-3.2h-11.4c-1.8 0-3.2 1.4-3.2 3.2v71.1c0 .9.3 1.6.9 2.2.6.5 1.3.9 2.2.9h45.7c1.8 0 3.2-1.4 3.2-3.2v-11.4c0-1.7-1.4-3.2-3.1-3.2zM332.1 201.6c0-11.3-9.1-20.4-20.4-20.4s-20.4 9.1-20.4 20.4v13.6c0 11.3 9.1 20.4 20.4 20.4s20.4-9.1 20.4-20.4v-13.6zm-20.4 7.2c-3.6 0-6.4 2.8-6.4 6.4v7.2c0 3.6 2.8 6.4 6.4 6.4s6.4-2.8 6.4-6.4v-7.2c0-3.6-2.8-6.4-6.4-6.4z"></path>
                <path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm0 400c-97.2 0-176-78.8-176-176s78.8-176 176-176 176 78.8 176 176-78.8 176-176 176z"></path>
              </svg>
              Copy Link
            </a>
            {isLoggedIn && (
              <a
                className="dropdown-item dropdownMainMenuItem"
                onClick={() => setShowReportPopUp(Date.now())}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  className="IBMSMSMSSS_Author_Top_Icon"
                >
                  <path d="M506.3 417l-213.3-364c-16.33-28-57.54-28-73.98 0l-213.2 364C-10.59 444.9 9.849 480 42.74 480h426.6C502.1 480 522.6 445 506.3 417zM232 168c0-13.25 10.75-24 24-24S280 154.8 280 168v128c0 13.25-10.75 24-23.1 24S232 309.3 232 296V168zM256 416c-17.36 0-31.44-14.08-31.44-31.44c0-17.36 14.07-31.44 31.44-31.44s31.44 14.08 31.44 31.44C287.4 401.9 273.4 416 256 416z"></path>
                </svg>
                Report
              </a>
            )}
            <a
              className="dropdown-item dropdownMainMenuItem"
              onClick={handleBlock}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-32 0 512 512"
                width="1em"
                height="1em"
                fill="currentColor"
                className="IBMSMSMSSS_Author_Top_Icon"
              >
                <path d="M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 65.13-83.3c10.14-2.656 19.94 4.78 19.94 15.27c0 6.941-4.469 13.16-11.16 15.19c-17.5 4.578-34.41 23.94-34.41 52.84c0 50.81 39.31 94.81 91.41 94.81c24.66 0 45.22-6.5 63.19-18.75c11.75-8 27.91 3.469 23.91 16.69C314.6 384.7 309.8 388.4 304.1 391.9z"></path>
              </svg>
              {isBlocked ? 'Unblock' : 'Block'} Post
            </a>
            {isAdmin && (
              <>
                <a
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={handleNSFW}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="-32 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMSSS_Author_Top_Icon"
                  >
                    <path d="M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 65.13-83.3c10.14-2.656 19.94 4.78 19.94 15.27c0 6.941-4.469 13.16-11.16 15.19c-17.5 4.578-34.41 23.94-34.41 52.84c0 50.81 39.31 94.81 91.41 94.81c24.66 0 45.22-6.5 63.19-18.75c11.75-8 27.91 3.469 23.91 16.69C314.6 384.7 309.8 388.4 304.1 391.9z"></path>
                  </svg>
                  {isAddedToNSFW ? 'Un-mark' : 'Mark'} as NSFW
                </a>
                <a
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={handleRepost}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="-32 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMSSS_Author_Top_Icon"
                  >
                    <path d="M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 65.13-83.3c10.14-2.656 19.94 4.78 19.94 15.27c0 6.941-4.469 13.16-11.16 15.19c-17.5 4.578-34.41 23.94-34.41 52.84c0 50.81 39.31 94.81 91.41 94.81c24.66 0 45.22-6.5 63.19-18.75c11.75-8 27.91 3.469 23.91 16.69C314.6 384.7 309.8 388.4 304.1 391.9z"></path>
                  </svg>
                  {isRepost ? 'Un-mark' : 'Mark'} as Repost
                </a>
                <a
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={handleHardBlock}
                  style={{ color: 'rgba(255, 70, 70, 0.8)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    className="IBMSMSMSSS_Author_Top_Icon"
                  >
                    <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zM256 464c-114.7 0-208-93.31-208-208S141.3 48 256 48s208 93.31 208 208S370.7 464 256 464zM256 304c13.25 0 24-10.75 24-24v-128C280 138.8 269.3 128 256 128S232 138.8 232 152v128C232 293.3 242.8 304 256 304zM256 337.1c-17.36 0-31.44 14.08-31.44 31.44C224.6 385.9 238.6 400 256 400s31.44-14.08 31.44-31.44C287.4 351.2 273.4 337.1 256 337.1z"></path>
                  </svg>
                  {isHardBlocked && hardBlockedType === 'post'
                    ? 'Hard Unblock'
                    : 'Hard Block'}{' '}
                  Post
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      {!!showReportPopUp && (
        <ReportPopup
          openedAt={showReportPopUp}
          reasons={MOD_REPORT_REASONS}
          handleClose={() => setShowReportPopUp(undefined)}
        />
      )}
      {showDeletePopup && (
        <AlertPopup
          handleClose={() => setShowDeletePopup(false)}
          header="Request Mod Post Deletion"
          label="Are you sure you want to request deletion of this mod post?"
          handleConfirm={handleDelete}
          yesButtonLabel="Request Deletion"
          yesButtonColor="rgba(255, 70, 70, 0.65)"
          noButtonLabel="Cancel"
        >
          <div>
            <p className="text-muted">
              Note: This will create a deletion event (kind 5) that references
              your mod post. The post will be marked as deleted but may still be
              visible in some clients.
            </p>
          </div>
        </AlertPopup>
      )}
    </>
  )
}

type BodyProps = Pick<
  ModDetails,
  | 'featuredImageUrl'
  | 'title'
  | 'body'
  | 'game'
  | 'screenshotsUrls'
  | 'tags'
  | 'LTags'
  | 'nsfw'
  | 'repost'
  | 'originalAuthor'
  | keyof ModPermissions
  | 'publisherNotes'
  | 'extraCredits'
>

const Body = ({
  featuredImageUrl,
  game,
  title,
  body,
  screenshotsUrls,
  tags,
  LTags,
  nsfw,
  repost,
  originalAuthor,
  otherAssets,
  uploadPermission,
  modPermission,
  convPermission,
  assetUsePermission,
  assetUseComPermission,
  publisherNotes,
  extraCredits
}: BodyProps) => {
  const COLLAPSED_MAX_SIZE = 250
  const postBodyRef = useRef<HTMLDivElement>(null)
  const viewFullPostBtnRef = useRef<HTMLDivElement>(null)
  const [lightBoxController, setLightBoxController] = useState({
    toggler: false,
    slide: 1
  })

  const navigate = useNavigate()

  // Get blossom server lists for image fallback
  const { hostMirrors, defaultHostMirrors } = useBlossomList()

  // Use image fallback for featured image background
  const { currentUrl: featuredImageCurrentUrl } = useImageFallback({
    originalUrl: featuredImageUrl,
    personalBlossomList: hostMirrors.mirrors,
    defaultBlossomList: defaultHostMirrors,
    prioritizeOriginal: true
  })

  const openLightBoxOnSlide = (slide: number) => {
    setLightBoxController((prev) => ({
      toggler: !prev.toggler,
      slide
    }))
  }

  useEffect(() => {
    if (postBodyRef.current) {
      if (postBodyRef.current.scrollHeight <= COLLAPSED_MAX_SIZE) {
        viewFullPost()
      }
    }
  }, [])

  const viewFullPost = () => {
    if (postBodyRef.current && viewFullPostBtnRef.current) {
      postBodyRef.current.style.maxHeight = 'unset'
      postBodyRef.current.style.padding = 'unset'
      viewFullPostBtnRef.current.style.display = 'none'
    }
  }

  const handleTagClick = (tag: string) => {
    const encodedGame = encodeURIComponent(game)
    const encodedTag = encodeURIComponent(tag)
    const encodedGameRoute = appRoutes.game.replace(':name', encodedGame)

    navigate(`${encodedGameRoute}?t=${encodedTag}`)
  }

  return (
    <>
      <div className="IBMSMSMBSSPost">
        <div
          className="IBMSMSMBSSPostPicture"
          style={{
            background: `url(${featuredImageCurrentUrl}) center / cover no-repeat`
          }}
        ></div>
        <div className="IBMSMSMBSSPostInside">
          <div className="IBMSMSMBSSPostTitle">
            <h1 className="IBMSMSMBSSPostTitleHeading">{title}</h1>
          </div>
          <div
            ref={postBodyRef}
            className="IBMSMSMBSSPostBody"
            style={{
              maxHeight: `${COLLAPSED_MAX_SIZE}px`,
              padding: '10px 18px'
            }}
          >
            <Viewer markdown={body} />
            <div ref={viewFullPostBtnRef} className="IBMSMSMBSSPostBodyHide">
              <div className="IBMSMSMBSSPostBodyHideText">
                <p onClick={viewFullPost}>Read Full</p>
              </div>
            </div>
          </div>
          <div className="IBMSMSMBSSShotsWrapper">
            <div className="IBMSMSMBSSShots">
              {screenshotsUrls.map((url, index) => (
                <ImageWithFallback
                  className="IBMSMSMBSSShotsImg"
                  src={url}
                  alt=""
                  key={`ScreenShot-${index}`}
                  onClick={() => openLightBoxOnSlide(index + 1)}
                  personalBlossomList={hostMirrors.mirrors}
                  defaultBlossomList={defaultHostMirrors}
                  prioritizeOriginal={true}
                />
              ))}
            </div>
          </div>
          <ExtraDetails
            otherAssets={otherAssets}
            uploadPermission={uploadPermission}
            modPermission={modPermission}
            convPermission={convPermission}
            assetUsePermission={assetUsePermission}
            assetUseComPermission={assetUseComPermission}
            publisherNotes={publisherNotes}
            extraCredits={extraCredits}
          />
          <div className="IBMSMSMBSSTags">
            {nsfw && (
              <div className="IBMSMSMBSSTagsTag IBMSMSMBSSTagsTagNSFW">
                <p>NSFW</p>
              </div>
            )}

            {repost && (
              <div className="IBMSMSMBSSTagsTag IBMSMSMBSSTagsTagRepost">
                <p>
                  REPOST
                  {originalAuthor && originalAuthor !== '' && (
                    <>
                      . Original Author:{' '}
                      <OriginalAuthor value={originalAuthor} fallback={true} />
                    </>
                  )}
                </p>
              </div>
            )}

            {tags.map((tag, index) => (
              <a
                className="IBMSMSMBSSTagsTag"
                href="#"
                key={`tag-${index}`}
                onClick={(e) => {
                  e.preventDefault()
                  handleTagClick(tag)
                }}
              >
                {tag}
              </a>
            ))}

            {LTags.length > 0 && (
              <div className="IBMSMSMBSSCategories">
                {LTags.map((hierarchy) => {
                  const hierarchicalCategories = hierarchy.split(`:`)
                  const categories = hierarchicalCategories
                    .map<React.ReactNode>((c, i) => {
                      const partialHierarchy = hierarchicalCategories
                        .slice(0, i + 1)
                        .join(':')

                      return (
                        <ReactRouterLink
                          className="IBMSMSMBSSCategoriesBoxItem"
                          key={`category-${i}`}
                          target="_blank"
                          to={{
                            pathname: getGamePageRoute(game),
                            search: `h=${partialHierarchy}`
                          }}
                        >
                          <p>{capitalizeEachWord(c)}</p>
                        </ReactRouterLink>
                      )
                    })
                    .reduce((prev, curr, i) => [
                      prev,
                      <div
                        key={`separator-${i}`}
                        className="IBMSMSMBSSCategoriesBoxSeparator"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </div>,
                      curr
                    ])

                  return (
                    <div key={hierarchy} className="IBMSMSMBSSCategoriesBox">
                      {categories}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <FsLightbox
        toggler={lightBoxController.toggler}
        sources={screenshotsUrls}
        slide={lightBoxController.slide}
      />
    </>
  )
}

const Download = (
  props: DownloadUrl & { commenterBlossomServers?: UserBlossom[] }
) => {
  const {
    url,
    title,
    malwareScanLink,
    hash,
    commenterBlossomServers = []
  } = props
  const [showAuthDetails, setShowAuthDetails] = useState(false)
  const [showHashVerification, setShowHashVerification] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [showScanNotice, setShowCanNotice] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [bestUrl, setBestUrl] = useState(url)
  const [allUrls, setAllUrls] = useState<string[]>([url])

  // Get blossom server lists
  const { hostMirrors, defaultHostMirrors } = useBlossomList()

  useDidMount(async () => {
    const isFile = await checkUrlForFile(url)
    setShowNotice(!isFile)

    // Check the malware scan url
    // if it's valid URL
    // if it contains sha256
    // if it differs from download link
    setShowCanNotice(
      !(
        malwareScanLink &&
        isValidUrl(malwareScanLink) &&
        /\b[a-fA-F0-9]{64}\b/.test(malwareScanLink) &&
        malwareScanLink !== url
      )
    )

    // Search for better download URL using hash if available
    if (hash) {
      try {
        setIsSearching(true)
        setSearchError(null)

        // Convert commenter blossom servers to the expected format
        const commenterBlossomList = getUniqueCommenterBlossomServers(
          commenterBlossomServers
        )

        const resolvedUrls = await findAllDownloadUrls(
          hash,
          url,
          hostMirrors.mirrors,
          defaultHostMirrors,
          commenterBlossomList
        )

        setAllUrls(resolvedUrls)
        setBestUrl(resolvedUrls[0])
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : 'Search failed')
        setAllUrls([url]) // Fallback to original URL only
        setBestUrl(url) // Fallback to original URL
      } finally {
        setIsSearching(false)
      }
    }
  })

  const handleDownload = async () => {
    // If hash is available, open verification popup
    if (hash || props.automaticHash) {
      setShowHashVerification(true)
    } else {
      // No hash available, proceed with direct download
      const filename = getFilenameFromUrl(bestUrl)
      try {
        await downloadFileWithFallback(allUrls, filename)
      } catch (error) {
        toast.error('Download failed. Please try again later.')
      }
    }
  }

  return (
    <div className="IBMSMSMBSSDownloadsElement">
      {typeof title !== 'undefined' && title !== '' && (
        <span className="IBMSMSMBSSDownloadsElementDtitle">{title}</span>
      )}
      <div className="IBMSMSMBSSDownloadsElementInside">
        <button
          className="btn btnMain IBMSMSMBSSDownloadsElementBtn"
          type="button"
          onClick={handleDownload}
          disabled={isSearching}
        >
          {isSearching ? 'Searching servers...' : 'Download'}
        </button>
      </div>
      {isSearching && (
        <div className="IBMSMSMBSSNote">
          <p>Searching for file across blossom servers...</p>
        </div>
      )}
      {searchError && (
        <div className="IBMSMSMBSSWarning">
          <p>
            Server search failed: {searchError}. Using original download link.
          </p>
        </div>
      )}
      {!isSearching && bestUrl !== url && (
        <div className="IBMSMSMBSSNote">
          <p>✓ Found file on alternative server for faster download.</p>
        </div>
      )}
      {showNotice && (
        <div className="IBMSMSMBSSNote">
          <p>
            Notice: The creator has provided a download link that doesn&#39;t
            download the files immediately, but rather redirects you to a
            different site.
            <br />
          </p>
        </div>
      )}
      {showScanNotice && (
        <div className="IBMSMSMBSSWarning">
          <p>
            The mod poster hasn't provided a malware scan report for these
            files. Be careful.
            <br />
          </p>
        </div>
      )}
      <div className="IBMSMSMBSSDownloadsElementInside IBMSMSMBSSDownloadsElementInsideAlt">
        <p
          className="IBMSMSMBSSDownloadsElementInsideAltText"
          onClick={() => setShowAuthDetails((prev) => !prev)}
        >
          Authentication Details
        </p>
        {showAuthDetails && (
          <DownloadDetailsPopup
            {...props}
            allUrls={allUrls}
            hostMirrors={hostMirrors.mirrors}
            defaultHostMirrors={defaultHostMirrors}
            handleClose={() => setShowAuthDetails(false)}
          />
        )}
        {showHashVerification && (
          <HashVerificationPopup
            {...props}
            allUrls={allUrls}
            handleClose={() => setShowHashVerification(false)}
          />
        )}
      </div>
    </div>
  )
}

const DisplayModAuthorBlogs = () => {
  const { latest } = useLoaderData() as ModPageLoaderResult
  const { deletedBlogIds, loading: checkingDeletedBlogs } = useDeletedBlogs(
    latest || []
  )

  if (!latest?.length) return null

  // Filter out deleted blog posts
  const filteredBlogs = latest.filter((b) => !b.id || !deletedBlogIds.has(b.id))

  if (filteredBlogs.length === 0) return null

  return (
    <div className="IBMSMSplitMainBigSideSec">
      <div className="IBMSMSMBSSPostsWrapper">
        <h4 className="IBMSMSMBSSPostsTitle">Creator's Blog Posts</h4>
        {checkingDeletedBlogs ? (
          <LoadingSpinner desc="Checking deleted posts" />
        ) : (
          <div className="IBMSMList IBMSMListAlt">
            {filteredBlogs.map((b) => (
              <BlogCard key={b.id} {...b} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type ExtraDetailsProps = ModPermissions &
  Pick<ModFormState, 'publisherNotes' | 'extraCredits'>
const ExtraDetails = ({
  publisherNotes,
  extraCredits,
  ...rest
}: ExtraDetailsProps) => {
  const extraBoxRef = useRef<HTMLDivElement>(null)

  if (
    typeof publisherNotes === 'undefined' &&
    typeof extraCredits === 'undefined' &&
    Object.values(rest).every((v) => typeof v === 'undefined')
  ) {
    return null
  }

  const handleClick = () => {
    if (extraBoxRef.current) {
      if (extraBoxRef.current.style.display === '') {
        extraBoxRef.current.style.display = 'none'
      } else {
        extraBoxRef.current.style.display = ''
      }
    }
  }
  return (
    <div className="IBMSMSMBSSExtra">
      <button
        className="btn btnMain IBMSMSMBSSExtraBtn"
        type="button"
        onClick={handleClick}
      >
        Permissions &amp; Details
      </button>
      <div
        className="IBMSMSMBSSExtraBox"
        ref={extraBoxRef}
        style={{
          display: 'none'
        }}
      >
        <div className="IBMSMSMBSSExtraBoxElementWrapper">
          {Object.keys(MODPERMISSIONS_CONF).map((k) => {
            const permKey = k as keyof ModPermissions
            const confKey = k as keyof typeof MODPERMISSIONS_CONF
            const modPermission = MODPERMISSIONS_CONF[confKey]
            const value = rest[permKey]
            if (typeof value === 'undefined') return null

            const text = MODPERMISSIONS_DESC[`${permKey}_${value}`]

            return (
              <div className="IBMSMSMBSSExtraBoxElement" key={k}>
                <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart">
                  <p>{modPermission.header}</p>
                  {value ? (
                    <div className="IBMSMSMBSSExtraBoxElementColMark IBMSMSMBSSExtraBoxElementColMarkGreen">
                      <svg
                        className="IBMSMSMSSS_Author_Top_Icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width="1em"
                        height="1em"
                        fill="currentColor"
                      >
                        <path d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM371.8 211.8C382.7 200.9 382.7 183.1 371.8 172.2C360.9 161.3 343.1 161.3 332.2 172.2L224 280.4L179.8 236.2C168.9 225.3 151.1 225.3 140.2 236.2C129.3 247.1 129.3 264.9 140.2 275.8L204.2 339.8C215.1 350.7 232.9 350.7 243.8 339.8L371.8 211.8z"></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="IBMSMSMBSSExtraBoxElementColMark IBMSMSMBSSExtraBoxElementColMarkRed">
                      <svg
                        className="IBMSMSMSSS_Author_Top_Icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width="1em"
                        height="1em"
                        fill="currentColor"
                      >
                        <path d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1C217.5 326.8 217.5 311.6 208.1 302.3L160.1 255.1L208.1 208.1C217.5 198.8 217.5 183.6 208.1 174.3C198.8 165 183.6 165 174.3 174.3L126.3 222.3C117 231.6 117 246.8 126.3 256.1C135.6 265.4 150.8 265.4 160.1 256.1L208.1 208.1z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond">
                  <p>
                    {text}
                    <br />
                  </p>
                </div>
              </div>
            )
          })}
          {typeof publisherNotes !== 'undefined' && publisherNotes !== '' && (
            <div className="IBMSMSMBSSExtraBoxElement">
              <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart">
                <p>Publisher Notes</p>
              </div>
              <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond">
                <p>{publisherNotes}</p>
              </div>
            </div>
          )}
          {typeof extraCredits !== 'undefined' && extraCredits !== '' && (
            <div className="IBMSMSMBSSExtraBoxElement">
              <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColStart">
                <p>Extra Credits</p>
              </div>
              <div className="IBMSMSMBSSExtraBoxElementCol IBMSMSMBSSExtraBoxElementColSecond">
                <p>{extraCredits}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
