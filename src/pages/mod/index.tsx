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
  useLocalStorage
} from '../../hooks'
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
import {
  capitalizeEachWord,
  checkUrlForFile,
  copyTextToClipboard,
  downloadFile,
  getFilenameFromUrl,
  isValidUrl
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
import { NsfwAlertPopup } from 'components/NsfwAlertPopup'
import useModData from './useModData'

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
                    <div className="IBMSMSplitMainBigSideSec">
                      <Game />
                      {postWarning && <PostWarnings type={postWarning} />}
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
                        {postWarning && <PostWarnings type={postWarning} />}
                        {mod.downloadUrls.length > 0 && (
                          <div className="IBMSMSMBSSDownloadsPrime">
                            <Download {...mod.downloadUrls[0]} />
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
                ) : (
                  <Spinner />
                )}
              </div>
              {typeof author !== 'undefined' && (
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
  // const { mod, isAddedToNSFW, isBlocked, isRepost } = useModData()
  const { mod, isAddedToNSFW, isBlocked, isRepost } =
    useLoaderData() as ModPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const isLoggedIn = userState.auth && userState.user?.pubkey !== 'undefined'
  const [showReportPopUp, setShowReportPopUp] = useState<number | undefined>()

  useBodyScrollDisable(!!showReportPopUp)

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
          <div className={`dropdown-menu dropdown-menu-end dropdownMainMenu`}>
            {userState.auth && userState.user?.pubkey === mod?.author && (
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
                <path d="M384 96L384 0h-112c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48H464c26.51 0 48-21.49 48-48V128h-95.1C398.4 128 384 113.6 384 96zM416 0v96h96L416 0zM192 352V128h-144c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h192c26.51 0 48-21.49 48-48L288 416h-32C220.7 416 192 387.3 192 352z"></path>
              </svg>
              Copy URL
            </a>
            <a className="dropdown-item dropdownMainMenuItem" href="#">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                width="1em"
                height="1em"
                fill="currentColor"
                className="IBMSMSMSSS_Author_Top_Icon"
              >
                <path d="M503.7 226.2l-176 151.1c-15.38 13.3-39.69 2.545-39.69-18.16V272.1C132.9 274.3 66.06 312.8 111.4 457.8c5.031 16.09-14.41 28.56-28.06 18.62C39.59 444.6 0 383.8 0 322.3c0-152.2 127.4-184.4 288-186.3V56.02c0-20.67 24.28-31.46 39.69-18.16l176 151.1C514.8 199.4 514.8 216.6 503.7 226.2z"></path>
              </svg>
              Share
            </a>
            {isLoggedIn && (
              <a
                className="dropdown-item dropdownMainMenuItem"
                id="reportPost"
                onClick={() => {
                  setShowReportPopUp(Date.now())
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

  return (
    <>
      <div className="IBMSMSMBSSPost">
        <div
          className="IBMSMSMBSSPostPicture"
          style={{
            background: `url(${featuredImageUrl}) center / cover no-repeat`
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
                <img
                  className="IBMSMSMBSSShotsImg"
                  src={url}
                  alt=""
                  key={`ScreenShot-${index}`}
                  onClick={() => openLightBoxOnSlide(index + 1)}
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
              <a className="IBMSMSMBSSTagsTag" href="#" key={`tag-${index}`}>
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

const Download = (props: DownloadUrl) => {
  const { url, title, malwareScanLink } = props
  const [showAuthDetails, setShowAuthDetails] = useState(false)
  const [showNotice, setShowNotice] = useState(false)
  const [showScanNotice, setShowCanNotice] = useState(false)

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
  })

  const handleDownload = () => {
    // Get the filename from the URL
    const filename = getFilenameFromUrl(url)

    downloadFile(url, filename)
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
        >
          Download
        </button>
      </div>
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
      {/*temporarily commented out the WoT rating for download links within a mod post
      <div className='IBMSMSMBSSDownloadsElementInside'>
        <p>Ratings (WIP):</p>
        <div className='tabsMain'>
          <ul className='nav nav-tabs tabsMainTop' role='tablist'>
            <li className='nav-item tabsMainTopTab' role='presentation'>
              <a
                className='nav-link active tabsMainTopTabLink'
                role='tab'
                data-bs-toggle='tab'
                href='#tab-1'
              >
                WoT
              </a>
            </li>
            <li className='nav-item tabsMainTopTab' role='presentation'>
              <a
                className='nav-link tabsMainTopTabLink'
                role='tab'
                data-bs-toggle='tab'
                href='#tab-2'
              >
                All
              </a>
            </li>
          </ul>
          <div className='tab-content tabsMainBottom'>
            <div
              className='tab-pane active tabsMainBottomContent'
              role='tabpanel'
              id='tab-1'
            >
              <div className='IBMSMSMBSSDownloadsElementInsideReactions'>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement IBMSMSMBSSDEIReactionsElementActive'
                  title='Clean'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M512 165.4c0 127.9-70.05 235.3-175.3 270.1c-20.04 7.938-41.83 12.46-64.69 12.46c-64.9 0-125.2-36.51-155.7-94.47c-54.13 49.93-68.71 107-68.96 108.1C44.72 472.6 34.87 480 24.02 480c-1.844 0-3.727-.2187-5.602-.6562c-12.89-3.098-20.84-16.08-17.75-28.96c9.598-39.5 90.47-226.4 335.3-226.4C344.8 224 352 216.8 352 208S344.8 192 336 192C228.6 192 151 226.6 96.29 267.6c.1934-10.82 1.242-21.84 3.535-33.05c13.47-65.81 66.04-119 131.4-134.2c28.33-6.562 55.68-6.013 80.93-.0054c56 13.32 118.2-7.412 149.3-61.24c5.664-9.828 20.02-9.516 24.66 .8282C502.7 76.76 512 121.9 512 165.4z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>420</p>
                </div>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement'
                  title='Broken link'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 -64 640 640'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M185.7 120.3C242.5 75.82 324.7 79.73 376.1 131.1C420.1 175.1 430.9 239.6 406.7 293.5L438.6 318.4L534.5 222.5C566 191 566 139.1 534.5 108.5C506.7 80.63 462.7 76.1 430.7 99.9L429.1 101C414.7 111.3 394.7 107.1 384.5 93.58C374.2 79.2 377.5 59.21 391.9 48.94L393.5 47.82C451 6.732 529.8 13.25 579.8 63.24C636.3 119.7 636.3 211.3 579.8 267.7L489.3 358.2L630.8 469.1C641.2 477.3 643.1 492.4 634.9 502.8C626.7 513.2 611.6 515.1 601.2 506.9L9.196 42.89C-1.236 34.71-3.065 19.63 5.112 9.196C13.29-1.236 28.37-3.065 38.81 5.112L185.7 120.3zM238.1 161.1L353.4 251.7C359.3 225.5 351.7 197.2 331.7 177.2C306.6 152.1 269.1 147 238.1 161.1V161.1zM263 380C233.1 350.1 218.7 309.8 220.9 270L406.6 416.4C357.4 431 301.9 418.9 263 380V380zM116.6 187.9L167.2 227.8L105.5 289.5C73.99 320.1 73.99 372 105.5 403.5C133.3 431.4 177.3 435 209.3 412.1L210.9 410.1C225.3 400.7 245.3 404 255.5 418.4C265.8 432.8 262.5 452.8 248.1 463.1L246.5 464.2C188.1 505.3 110.2 498.7 60.21 448.8C3.741 392.3 3.741 300.7 60.21 244.3L116.6 187.9z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>420</p>
                </div>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement'
                  title='Has virus'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M288 43.55C288 93.44 348.3 118.4 383.6 83.15L391.8 74.98C404.3 62.48 424.5 62.48 437 74.98C449.5 87.48 449.5 107.7 437 120.2L368.7 188.6C352.7 204.3 341.4 224.8 337.6 249.8L168.3 420.1C148.4 448.6 104.5 448.6 84.63 420.1C64.73 391.5 64.73 347.6 84.63 319.1L172.4 231.3C208.7 197 233.6 154.3 233.6 104.4C233.6 54.47 173.3 29.5 138 64.73L130.1 72.9C117.6 85.4 97.41 85.4 84.94 72.9C72.44 60.4 72.44 40.17 84.94 27.67L153.2-41.52C194.8-83.6 295.2-83.6 336.7-41.52C375.5 2.213 377.4 55.78 288 43.55zM121.4 169.3L44.88 245.8C25.35 265.6 25.35 295.7 44.88 315.5L138.4 408.9C147.4 417.1 166.5 421.6 181.5 417.1L296.7 295.7C306.2 272.4 318.5 253.3 333.3 239.8L237.2 142.2C222.4 123.2 204.1 105.3 181.5 105.3C159.1 105.3 141.3 123.2 126.6 142.2L121.4 169.3zM250.7 419.8L299.4 428.2C316.8 433.6 335.5 423.6 336.8 410.8L342.8 236.8C344.1 225 336.8 213.2 325.4 211.4L146.2 160.1C134.7 158.8 120.5 174.7 121.1 185.7L127.8 359.6C128.4 370.9 143.8 382.3 156.1 376.4L250.7 419.8z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>420</p>
                </div>
              </div>
            </div>
            <div
              className='tab-pane tabsMainBottomContent'
              role='tabpanel'
              id='tab-2'
            >
              <div className='IBMSMSMBSSDownloadsElementInsideReactions'>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement IBMSMSMBSSDEIReactionsElementActive'
                  title='Clean'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M512 165.4c0 127.9-70.05 235.3-175.3 270.1c-20.04 7.938-41.83 12.46-64.69 12.46c-64.9 0-125.2-36.51-155.7-94.47c-54.13 49.93-68.71 107-68.96 108.1C44.72 472.6 34.87 480 24.02 480c-1.844 0-3.727-.2187-5.602-.6562c-12.89-3.098-20.84-16.08-17.75-28.96c9.598-39.5 90.47-226.4 335.3-226.4C344.8 224 352 216.8 352 208S344.8 192 336 192C228.6 192 151 226.6 96.29 267.6c.1934-10.82 1.242-21.84 3.535-33.05c13.47-65.81 66.04-119 131.4-134.2c28.33-6.562 55.68-6.013 80.93-.0054c56 13.32 118.2-7.412 149.3-61.24c5.664-9.828 20.02-9.516 24.66 .8282C502.7 76.76 512 121.9 512 165.4z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>4,200</p>
                </div>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement'
                  title='Broken link'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 -64 640 640'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M185.7 120.3C242.5 75.82 324.7 79.73 376.1 131.1C420.1 175.1 430.9 239.6 406.7 293.5L438.6 318.4L534.5 222.5C566 191 566 139.1 534.5 108.5C506.7 80.63 462.7 76.1 430.7 99.9L429.1 101C414.7 111.3 394.7 107.1 384.5 93.58C374.2 79.2 377.5 59.21 391.9 48.94L393.5 47.82C451 6.732 529.8 13.25 579.8 63.24C636.3 119.7 636.3 211.3 579.8 267.7L489.3 358.2L630.8 469.1C641.2 477.3 643.1 492.4 634.9 502.8C626.7 513.2 611.6 515.1 601.2 506.9L9.196 42.89C-1.236 34.71-3.065 19.63 5.112 9.196C13.29-1.236 28.37-3.065 38.81 5.112L185.7 120.3zM238.1 161.1L353.4 251.7C359.3 225.5 351.7 197.2 331.7 177.2C306.6 152.1 269.1 147 238.1 161.1V161.1zM263 380C233.1 350.1 218.7 309.8 220.9 270L406.6 416.4C357.4 431 301.9 418.9 263 380V380zM116.6 187.9L167.2 227.8L105.5 289.5C73.99 320.1 73.99 372 105.5 403.5C133.3 431.4 177.3 435 209.3 412.1L210.9 410.1C225.3 400.7 245.3 404 255.5 418.4C265.8 432.8 262.5 452.8 248.1 463.1L246.5 464.2C188.1 505.3 110.2 498.7 60.21 448.8C3.741 392.3 3.741 300.7 60.21 244.3L116.6 187.9z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>4,200</p>
                </div>
                <div
                  data-bs-toggle='tooltip'
                  data-bss-tooltip=''
                  className='IBMSMSMBSSDEIReactionsElement'
                  title='Has virus'
                >
                  <div className='IBMSMSMBSSDEIReactionsElementIconWrapper'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 512 512'
                      width='1em'
                      height='1em'
                      fill='currentColor'
                      className='IBMSMSMBSSDEIReactionsElementIcon'
                    >
                      <path d='M288 43.55C288 93.44 348.3 118.4 383.6 83.15L391.8 74.98C404.3 62.48 424.5 62.48 437 74.98C449.5 87.48 449.5 107.7 437 120.2L368.7 188.6C352.7 204.3 341.4 224.8 337.6 249.8L168.3 420.1C148.4 448.6 104.5 448.6 84.63 420.1C64.73 391.5 64.73 347.6 84.63 319.1L172.4 231.3C208.7 197 233.6 154.3 233.6 104.4C233.6 54.47 173.3 29.5 138 64.73L130.1 72.9C117.6 85.4 97.41 85.4 84.94 72.9C72.44 60.4 72.44 40.17 84.94 27.67L153.2-41.52C194.8-83.6 295.2-83.6 336.7-41.52C375.5 2.213 377.4 55.78 288 43.55zM121.4 169.3L44.88 245.8C25.35 265.6 25.35 295.7 44.88 315.5L138.4 408.9C147.4 417.1 166.5 421.6 181.5 417.1L296.7 295.7C306.2 272.4 318.5 253.3 333.3 239.8L237.2 142.2C222.4 123.2 204.1 105.3 181.5 105.3C159.1 105.3 141.3 123.2 126.6 142.2L121.4 169.3zM250.7 419.8L299.4 428.2C316.8 433.6 335.5 423.6 336.8 410.8L342.8 236.8C344.1 225 336.8 213.2 325.4 211.4L146.2 160.1C134.7 158.8 120.5 174.7 121.1 185.7L127.8 359.6C128.4 370.9 143.8 382.3 156.1 376.4L250.7 419.8z' />
                    </svg>
                  </div>
                  <p className='IBMSMSMBSSDEIReactionsElementText'>4,200</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>*/}
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
            handleClose={() => setShowAuthDetails(false)}
          />
        )}
      </div>
    </div>
  )
}

const DisplayModAuthorBlogs = () => {
  // const { latest } = useModData()
  const { latest } = useLoaderData() as ModPageLoaderResult

  if (!latest?.length) return null

  return (
    <div className="IBMSMSplitMainBigSideSec">
      <div className="IBMSMSMBSSPostsWrapper">
        <h4 className="IBMSMSMBSSPostsTitle">Creator's Blog Posts</h4>
        <div className="IBMSMList IBMSMListAlt">
          {latest?.map((b) => <BlogCard key={b.id} {...b} />)}
        </div>
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
                        <path d="M0 256C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256zM175 208.1L222.1 255.1L175 303C165.7 312.4 165.7 327.6 175 336.1C184.4 346.3 199.6 346.3 208.1 336.1L255.1 289.9L303 336.1C312.4 346.3 327.6 346.3 336.1 336.1C346.3 327.6 346.3 312.4 336.1 303L289.9 255.1L336.1 208.1C346.3 199.6 346.3 184.4 336.1 175C327.6 165.7 312.4 165.7 303 175L255.1 222.1L208.1 175C199.6 165.7 184.4 165.7 175 175C165.7 184.4 165.7 199.6 175 208.1V208.1z"></path>
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
