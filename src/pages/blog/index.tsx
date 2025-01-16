import { useState } from 'react'
import {
  useLoaderData,
  Link as ReactRouterLink,
  useNavigation,
  useSubmit
} from 'react-router-dom'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { ProfileSection } from 'components/ProfileSection'
import { Comments } from 'components/comment'
import { Addressable, BlogPageLoaderResult } from 'types'
import placeholder from '../../assets/img/DEGMods Placeholder Img.png'
import { PublishDetails } from 'components/Internal/PublishDetails'
import { Interactions } from 'components/Internal/Interactions'
import { BlogCard } from 'components/BlogCard'
import { copyTextToClipboard } from 'utils'
import { toast } from 'react-toastify'
import { useAppSelector, useBodyScrollDisable } from 'hooks'
import { ReportPopup } from 'components/ReportPopup'
import { Viewer } from 'components/Markdown/Viewer'

const BLOG_REPORT_REASONS = [
  { label: 'Actually CP', key: 'actuallyCP' },
  { label: 'Spam', key: 'spam' },
  { label: 'Scam', key: 'scam' },
  { label: 'Malware', key: 'malware' },
  { label: `Wasn't tagged NSFW`, key: 'wasntTaggedNSFW' },
  { label: 'Other', key: 'otherReason' }
]

export const BlogPage = () => {
  const { blog, latest, isAddedToNSFW, isBlocked } =
    useLoaderData() as BlogPageLoaderResult
  const userState = useAppSelector((state) => state.user)
  const isAdmin =
    userState.user?.npub &&
    userState.user.npub === import.meta.env.VITE_REPORTING_NPUB
  const isLoggedIn = userState.auth && userState.user?.pubkey !== 'undefined'
  const navigation = useNavigation()
  const [commentCount, setCommentCount] = useState(0)

  const [showReportPopUp, setShowReportPopUp] = useState<number>()
  useBodyScrollDisable(!!showReportPopUp)

  const submit = useSubmit()
  const handleBlock = () => {
    if (navigation.state === 'idle') {
      submit(
        {
          intent: 'block',
          value: !isBlocked,
          target: blog?.aTag || ''
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
          value: !isAddedToNSFW,
          target: blog?.aTag || ''
        },
        {
          method: 'post',
          encType: 'application/json'
        }
      )
    }
  }

  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div className='IBMSecMainGroup IBMSecMainGroupAlt'>
          <div className='IBMSMSplitMain'>
            {blog && (
              <>
                <div className='IBMSMSplitMainBigSide'>
                  <div className='IBMSMSplitMainBigSideSec'>
                    <div className='IBMSMSMBSSPost'>
                      <div
                        className='dropdown dropdownMain dropdownMainBlogpost'
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
                        <div
                          className={`dropdown-menu dropdown-menu-end dropdownMainMenu`}
                        >
                          {userState.auth &&
                            userState.user?.pubkey === blog.author && (
                              <ReactRouterLink
                                className='dropdown-item dropdownMainMenuItem'
                                to={'edit'}
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
                              </ReactRouterLink>
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

                          {isLoggedIn && (
                            <a
                              className='dropdown-item dropdownMainMenuItem'
                              id='reportPost'
                              onClick={() => setShowReportPopUp(Date.now())}
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
                            onClick={handleBlock}
                          >
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              viewBox='-32 0 512 512'
                              width='1em'
                              height='1em'
                              fill='currentColor'
                              className='IBMSMSMSSS_Author_Top_Icon'
                            >
                              <path d='M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 65.13-83.3c10.14-2.656 19.94 4.78 19.94 15.27c0 6.941-4.469 13.16-11.16 15.19c-17.5 4.578-34.41 23.94-34.41 52.84c0 50.81 39.31 94.81 91.41 94.81c24.66 0 45.22-6.5 63.19-18.75c11.75-8 27.91 3.469 23.91 16.69C314.6 384.7 309.8 388.4 304.1 391.9z'></path>
                            </svg>
                            {isBlocked ? 'Unblock' : 'Block'} Blog
                          </a>

                          {isAdmin && (
                            <a
                              className='dropdown-item dropdownMainMenuItem'
                              onClick={handleNSFW}
                            >
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                viewBox='-32 0 512 512'
                                width='1em'
                                height='1em'
                                fill='currentColor'
                                className='IBMSMSMSSS_Author_Top_Icon'
                              >
                                <path d='M323.5 51.25C302.8 70.5 284 90.75 267.4 111.1C240.1 73.62 206.2 35.5 168 0C69.75 91.12 0 210 0 281.6C0 408.9 100.2 512 224 512s224-103.1 224-230.4C448 228.4 396 118.5 323.5 51.25zM304.1 391.9C282.4 407 255.8 416 226.9 416c-72.13 0-130.9-47.73-130.9-125.2c0-38.63 24.24-72.64 65.13-83.3c10.14-2.656 19.94 4.78 19.94 15.27c0 6.941-4.469 13.16-11.16 15.19c-17.5 4.578-34.41 23.94-34.41 52.84c0 50.81 39.31 94.81 91.41 94.81c24.66 0 45.22-6.5 63.19-18.75c11.75-8 27.91 3.469 23.91 16.69C314.6 384.7 309.8 388.4 304.1 391.9z'></path>
                              </svg>
                              {isAddedToNSFW ? 'Un-mark' : 'Mark'} as NSFW
                            </a>
                          )}
                        </div>
                      </div>
                      <div
                        className='IBMSMSMBSSPostPicture'
                        style={{
                          background: `url("${
                            blog.image !== '' ? blog.image : placeholder
                          }") center / cover no-repeat`
                        }}
                      ></div>
                      <div className='IBMSMSMBSSPostInside'>
                        <div className='IBMSMSMBSSPostTitle'>
                          <h1 className='IBMSMSMBSSPostTitleHeading'>
                            {blog.title}
                          </h1>
                        </div>
                        <div className='IBMSMSMBSSPostBody'>
                          <Viewer
                            key={blog.id}
                            markdown={blog?.content || ''}
                          />
                        </div>
                        <div className='IBMSMSMBSSTags'>
                          {blog.nsfw && (
                            <div className='IBMSMSMBSSTagsTag IBMSMSMBSSTagsTagNSFW'>
                              <p>NSFW</p>
                            </div>
                          )}
                          {blog.tTags &&
                            blog.tTags.map((t) => (
                              <a key={t} className='IBMSMSMBSSTagsTag'>
                                {t}
                              </a>
                            ))}
                        </div>
                      </div>
                    </div>
                    <Interactions
                      addressable={blog as Addressable}
                      commentCount={commentCount}
                    />
                    <PublishDetails
                      published_at={blog.published_at || 0}
                      edited_at={blog.edited_at || 0}
                      site={blog.rTag || 'N/A'}
                    />
                    {!!latest.length && (
                      <div className='IBMSMSplitMainBigSideSec'>
                        <div className='IBMSMSMBSSPostsWrapper'>
                          <h4 className='IBMSMSMBSSPostsTitle'>
                            Latest blog posts
                          </h4>
                          <div className='IBMSMList IBMSMListAlt'>
                            {latest.map((b) => (
                              <BlogCard key={b.id} {...b} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className='IBMSMSplitMainBigSideSec'>
                      <Comments
                        key={blog.id}
                        addressable={blog as Addressable}
                        setCommentCount={setCommentCount}
                      />
                    </div>
                  </div>
                </div>
                {navigation.state !== 'idle' && (
                  <LoadingSpinner desc={'Loading...'} />
                )}
                {!!showReportPopUp && (
                  <ReportPopup
                    openedAt={showReportPopUp}
                    reasons={BLOG_REPORT_REASONS}
                    handleClose={() => setShowReportPopUp(undefined)}
                  />
                )}
              </>
            )}
            {!!blog?.author && <ProfileSection pubkey={blog.author} />}
          </div>
        </div>
      </div>
    </div>
  )
}
