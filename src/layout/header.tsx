import {
  init as initNostrLogin,
  launch as launchNostrLoginDialog
} from 'nostr-login'
import React, { useEffect, useState } from 'react'
import { Link, useRevalidator } from 'react-router-dom'
import { Banner } from '../components/Banner'
import { ZapPopUp } from '../components/Zap'
import {
  useAppDispatch,
  useAppSelector,
  useBodyScrollDisable,
  useDidMount,
  useNDKContext
} from '../hooks'
import { appRoutes } from '../routes'
import { setAuth, setUser } from '../store/reducers/user'
import mainStyles from '../styles//main.module.scss'
import navStyles from '../styles/nav.module.scss'
import '../styles/popup.css'
import { npubToHex } from '../utils'
import logo from '../assets/img/DEG Mods Logo With Text.svg'
import placeholder from '../assets/img/DEG Mods Default PP.png'
import { resetUserWot } from 'store/reducers/wot'
import { NDKNip07Signer, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk'

export const Header = () => {
  const dispatch = useAppDispatch()
  const { findMetadata, ndk } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const revalidator = useRevalidator()
  // Track nostr-login extension modal open state
  const [isOpen, setIsOpen] = useState(false)
  const handleOpen = () => setIsOpen(true)
  const handleClose = () => setIsOpen(false)
  useEffect(() => {
    window.addEventListener('nlCloseModal', handleClose)
    return () => {
      window.removeEventListener('nlCloseModal', handleClose)
    }
  }, [])
  useBodyScrollDisable(isOpen)

  useEffect(() => {
    initNostrLogin({
      darkMode: true,
      noBanner: true,
      methods: ['extension'],
      onAuth: (npub, opts) => {
        if (opts.type === 'logout') {
          dispatch(setAuth(null))
          dispatch(setUser(null))
          dispatch(resetUserWot())
          ndk.signer = undefined
        } else {
          dispatch(
            setAuth({
              method: opts.method,
              localNsec: opts.localNsec
            })
          )
          dispatch(
            setUser({
              npub,
              pubkey: npubToHex(npub)!
            })
          )
          ndk.signer = new NDKNip07Signer()
          findMetadata(npub, {
            cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY
          }).then((userProfile) => {
            if (userProfile) {
              dispatch(
                setUser({
                  npub,
                  pubkey: npubToHex(npub)!,
                  ...userProfile
                })
              )
            }
          })
        }

        // React router - revalidate loader states on auth changes
        revalidator.revalidate()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, findMetadata])

  const handleLogin = () => {
    handleOpen()
    launchNostrLoginDialog()
  }

  return (
    <div className={navStyles.NavMain}>
      <Banner />
      <div className={navStyles.NavMainTop}>
        <div className={mainStyles.ContainerMain}>
          <div className={navStyles.NavMainTopInside}>
            <div className={navStyles.NMTI_Sec}>
              <Link to={appRoutes.home} className={navStyles.NMTI_Sec_HomeLink}>
                <div className={navStyles.NMTI_Sec_HomeLink_Logo}>
                  <img
                    className={navStyles.NMTI_Sec_HomeLink_LogoImg}
                    src={logo}
                  />
                </div>
              </Link>
            </div>
            <div className={navStyles.NMTI_Sec}>
              <div className={navStyles.NMTI_SecInside}>
                <TipButtonWithDialog />
                <Link
                  to={appRoutes.submitMod}
                  className={navStyles.NMTI_SecInside_Link}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                  >
                    <path d='M105.4 182.6c12.5 12.49 32.76 12.5 45.25 .001L224 109.3V352c0 17.67 14.33 32 32 32c17.67 0 32-14.33 32-32V109.3l73.38 73.38c12.49 12.49 32.75 12.49 45.25-.001c12.49-12.49 12.49-32.75 0-45.25l-128-128C272.4 3.125 264.2 0 256 0S239.6 3.125 233.4 9.375L105.4 137.4C92.88 149.9 92.88 170.1 105.4 182.6zM480 352h-160c0 35.35-28.65 64-64 64s-64-28.65-64-64H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456z'></path>
                  </svg>
                  Submit Mod
                </Link>
                <Link
                  to={appRoutes.write}
                  className={navStyles.NMTI_SecInside_Link}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                  >
                    <path d='M467.1 241.1L351.1 288h94.34c-7.711 14.85-16.29 29.28-25.87 43.01l-132.5 52.99h85.65c-59.34 52.71-144.1 80.34-264.5 52.82l-68.13 68.13c-9.38 9.38-24.56 9.374-33.94 0c-9.375-9.375-9.375-24.56 0-33.94l253.4-253.4c4.846-6.275 4.643-15.19-1.113-20.95c-6.25-6.25-16.38-6.25-22.62 0l-168.6 168.6C24.56 58 366.9 8.118 478.9 .0846c18.87-1.354 34.41 14.19 33.05 33.05C508.7 78.53 498.5 161.8 467.1 241.1z'></path>
                  </svg>
                  Write
                </Link>
                <Link
                  to={appRoutes.settingsProfile}
                  className={navStyles.NMTI_SecInside_Link}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                  >
                    <path d='M495.9 166.6C499.2 175.2 496.4 184.9 489.6 191.2L446.3 230.6C447.4 238.9 448 247.4 448 256C448 264.6 447.4 273.1 446.3 281.4L489.6 320.8C496.4 327.1 499.2 336.8 495.9 345.4C491.5 357.3 486.2 368.8 480.2 379.7L475.5 387.8C468.9 398.8 461.5 409.2 453.4 419.1C447.4 426.2 437.7 428.7 428.9 425.9L373.2 408.1C359.8 418.4 344.1 427 329.2 433.6L316.7 490.7C314.7 499.7 307.7 506.1 298.5 508.5C284.7 510.8 270.5 512 255.1 512C241.5 512 227.3 510.8 213.5 508.5C204.3 506.1 197.3 499.7 195.3 490.7L182.8 433.6C167 427 152.2 418.4 138.8 408.1L83.14 425.9C74.3 428.7 64.55 426.2 58.63 419.1C50.52 409.2 43.12 398.8 36.52 387.8L31.84 379.7C25.77 368.8 20.49 357.3 16.06 345.4C12.82 336.8 15.55 327.1 22.41 320.8L65.67 281.4C64.57 273.1 64 264.6 64 256C64 247.4 64.57 238.9 65.67 230.6L22.41 191.2C15.55 184.9 12.82 175.3 16.06 166.6C20.49 154.7 25.78 143.2 31.84 132.3L36.51 124.2C43.12 113.2 50.52 102.8 58.63 92.95C64.55 85.8 74.3 83.32 83.14 86.14L138.8 103.9C152.2 93.56 167 84.96 182.8 78.43L195.3 21.33C197.3 12.25 204.3 5.04 213.5 3.51C227.3 1.201 241.5 0 256 0C270.5 0 284.7 1.201 298.5 3.51C307.7 5.04 314.7 12.25 316.7 21.33L329.2 78.43C344.1 84.96 359.8 93.56 373.2 103.9L428.9 86.14C437.7 83.32 447.4 85.8 453.4 92.95C461.5 102.8 468.9 113.2 475.5 124.2L480.2 132.3C486.2 143.2 491.5 154.7 495.9 166.6V166.6zM256 336C300.2 336 336 300.2 336 255.1C336 211.8 300.2 175.1 256 175.1C211.8 175.1 176 211.8 176 255.1C176 300.2 211.8 336 256 336z'></path>
                  </svg>
                  Settings
                </Link>
                {!userState.auth && (
                  <>
                    <RegisterButtonWithDialog />
                    <a
                      id='loginNav'
                      className={navStyles.NMTI_SecInside_Link}
                      onClick={handleLogin}
                    >
                      <img
                        className={navStyles.NMTI_SecInside_LinkImg}
                        src={placeholder}
                      />
                      Login
                    </a>
                  </>
                )}
                {userState.auth && userState.user && (
                  <div className={navStyles.NMTI_SecInside_Link}>
                    {userState.user.image && (
                      <img
                        src={userState.user.image}
                        alt='Profile Avatar'
                        className={navStyles.NMTI_SecInside_LinkImg}
                      />
                    )}
                    <span className={navStyles.NMTI_SecInside_Username}>
                      {userState.user.name ||
                        userState.user.displayName ||
                        userState.user.npub}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={navStyles.NavMainBottom}>
        <div className={mainStyles.ContainerMain}>
          <div className={navStyles.NavMainBottomInside}>
            <div
              className={`${navStyles.NavMainBottomInsideOther} ${navStyles.NavMainBottomInsideOtherLeft}`}
            ></div>
            <div className={navStyles.NavMainBottomInsideLinks}>
              <Link
                to={appRoutes.games}
                className={navStyles.NavMainBottomInsideLink}
              >
                Games
              </Link>
              <Link
                to={appRoutes.mods}
                className={navStyles.NavMainBottomInsideLink}
              >
                Mods
              </Link>
              <Link
                to={appRoutes.about}
                className={navStyles.NavMainBottomInsideLink}
              >
                About
              </Link>
              <Link
                to={appRoutes.blogs}
                className={navStyles.NavMainBottomInsideLink}
              >
                Blog
              </Link>
              <Link
                to={appRoutes.modManager}
                className={navStyles.NavMainBottomInsideLink}
              >
                Mod Manager
              </Link>
            </div>
            <div
              className={`${navStyles.NavMainBottomInsideOther} ${navStyles.NavMainBottomInsideOtherRight}`}
            >
              <a
                className={navStyles.NavMainBottomInsideOtherLink}
                href='https://degmods.com/profile/nprofile1qqs0f0clkkagh6pe7ux8xvtn8ccf77qgy2e3ra37q8uaez4mks5034gfw4xg6'
                target='_blank'
              >
                <img
                  src='https://image.nostr.build/fb557f1b6d58c7bbcdf4d1edb1b48090c76ff1d1384b9d1aae13d652e7a3cfe4.gif'
                  width='15px'
                />
              </a>
              <a
                className={navStyles.NavMainBottomInsideOtherLink}
                href='https://x.com/DEGMods'
                target='_blank'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 512 512'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                >
                  <path d='M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z'></path>
                </svg>
              </a>
              <a
                className={navStyles.NavMainBottomInsideOtherLink}
                href='https://www.youtube.com/@DEGModsDotCom'
                target='_blank'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 512 512'
                  width='1em'
                  height='1em'
                  fill='currentColor'
                >
                  <path d='M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z'></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TipButtonWithDialog = React.memo(() => {
  const [adminNpub, setAdminNpub] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useBodyScrollDisable(isOpen)

  useDidMount(async () => {
    const adminNpubs = import.meta.env.VITE_ADMIN_NPUBS.split(',')
    setAdminNpub(adminNpubs[0])
  })

  return (
    <>
      <a
        className={`${navStyles.NMTI_SecInside_Link} ${navStyles.NMTI_SI_LinkTip}`}
        onClick={() => setIsOpen(true)}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='-64 0 512 512'
          width='1em'
          height='1em'
          fill='currentColor'
        >
          <path d='M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z'></path>
        </svg>
        Tip
      </a>
      {isOpen && adminNpub && (
        <ZapPopUp
          title='Tip/Zap DEG Mods'
          receiver={adminNpub}
          handleClose={() => setIsOpen(false)}
          labelDescriptionMain={
            <p className='labelDescriptionMain' style={{ textAlign: 'center' }}>
              If you don't want the development and maintenance of DEG Mods to
              stop, then a tip helps!
            </p>
          }
          lastNode={
            <div className='BTCAddressPopZap'>
              <p>
                DEG Mod's Silent Payment Bitcoin Address (Be careful.{' '}
                <a
                  href='https://youtu.be/payDPlHzp58?t=215'
                  className='linkMain'
                  target='_blank'
                >
                  Learn more
                </a>
                ):
                <br />
                <span className='BTCAddressPopZapTextSpan'>
                  sp1qq205tj23sq3z6qjxt5ts5ps8gdwcrkwypej3h2z2hdclmaptl25xxqjfqhc2de4gaxprgm0yqwfr737swpvvmrph9ctkeyk60knz6xpjhqumafrd
                </span>
              </p>
            </div>
          }
        />
      )}
    </>
  )
})

const RegisterButtonWithDialog = () => {
  const [showPopUp, setShowPopUp] = useState(false)

  useBodyScrollDisable(showPopUp)

  return (
    <>
      <a
        id='registerNav'
        className={navStyles.NMTI_SecInside_Link}
        onClick={() => setShowPopUp(true)}
      >
        Register
      </a>
      {showPopUp && (
        <div id='PopUpMainRegister' className='popUpMain'>
          <div className='ContainerMain'>
            <div className='popUpMainCardWrapper'>
              <div className='popUpMainCard popUpMainCardQR'>
                <div className='popUpMainCardTop'>
                  <div className='popUpMainCardTopInfo'>
                    <h3>Create an account via</h3>
                  </div>
                  <div
                    className='popUpMainCardTopClose'
                    onClick={() => setShowPopUp(false)}
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
                <div className='pUMCB_Zaps'>
                  <div className='pUMCB_ZapsInside'>
                    <div className='inputLabelWrapperMain'>
                      <label className='form-label labelMain'>
                        Browser Extensions (Windows)
                      </label>
                      <p className='labelDescriptionMain'>
                        Once you create your "account" on any of these, come
                        back and click login, then sign-in with extension.
                        Here's a quick video guide, and here's a{' '}
                        <a href='https://degmods.com/blog/naddr1qvzqqqr4gupzpa9lr76m4zlg88mscue3wvlrp8mcpq3txy0k8cqlnhy2hw6z37x4qqjrzcfc8qurjefn943xyen9956rywp595unjc3h94nxvwfexymxxcfnvdjxxlyq37c'>
                          guide post
                        </a>{' '}
                        to help with this process.
                      </p>
                      <div
                        style={{
                          width: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}
                      >
                        <video controls style={{ width: '100%' }}>
                          <source
                            src='https://video.nostr.build/765aa9bf16dd58bca701efee2572f7e77f29b2787cddd2bee8bbbdea35798153.mp4'
                            type='video/mp4'
                          />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                    <a
                      className='btn btnMain btnMainPopup'
                      role='button'
                      href='https://chromewebstore.google.com/detail/nostr-connect/ampjiinddmggbhpebhaegmjkbbeofoaj'
                      target='_blank'
                    >
                      Nostr Connect
                    </a>
                    <a
                      className='btn btnMain btnMainPopup'
                      role='button'
                      href='https://addons.mozilla.org/en-US/firefox/addon/nostr-connect/'
                      target='_blank'
                    >
                      Nostr Connect (Firefox)
                    </a>
                    <a
                      className='btn btnMain btnMainPopup'
                      role='button'
                      href='https://keys.band/'
                      target='_blank'
                    >
                      Keys.Band
                    </a>
                    <a
                      className='btn btnMain btnMainPopup'
                      role='button'
                      href='https://chromewebstore.google.com/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp'
                      target='_blank'
                    >
                      nos2x
                    </a>
                  </div>
                  <p
                    className='labelDescriptionMain'
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(205,44,255,0.1)',
                      border: 'solid 2px rgba(255,66,235,0.3)',
                      margin: '10px 0 0 0',
                      color: '#ffffffbf'
                    }}
                  >
                    Warning:&nbsp;Make sure you backup your private key
                    somewhere safe. If you lose it or it gets leaked, we
                    actually can't help you.
                  </p>
                  <p
                    className='labelDescriptionMain'
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(0,0,0,0.1)',
                      border: 'solid 1px rgba(255,255,255,0.1)',
                      margin: '10px 0 0 0'
                    }}
                  >
                    Q:&nbsp;Why can't I create an account normally?
                    <br />
                    A: DEG Mods can't ban you or delete your content (we can
                    only hide you), and the consequence of that is this kind of
                    registration/login system.
                  </p>
                  <div className='dividerPopup'>
                    <div className='dividerPopupLine'></div>
                    <p>or</p>
                    <div className='dividerPopupLine'></div>
                  </div>
                  <div className='pUMCB_ZapsInside'>
                    <div className='inputLabelWrapperMain'>
                      <label className='form-label labelMain'>
                        Browser Extensions (iOS)
                      </label>
                      <p className='labelDescriptionMain'>
                        Once you create your "account" on any of these, come
                        back and click login, then sign-in with extension.
                      </p>
                    </div>
                    <a
                      className='btn btnMain btnMainPopup'
                      role='button'
                      href='https://apps.apple.com/us/app/nostore/id1666553677'
                      target='_blank'
                    >
                      Nostore Browser Extension
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
