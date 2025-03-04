import { AdminSVG, PreferenceSVG, ProfileSVG, RelaySVG } from 'components/SVGs'
import { useAppSelector } from 'hooks'
import { logout } from 'nostr-login'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { appRoutes } from 'routes'
import { AuthMethod } from 'store/reducers/user'
import { copyTextToClipboard } from 'utils'
import { ProfileSettings } from './profile'
import { RelaySettings } from './relay'
import { PreferencesSetting } from './preference'
import { AdminSetting } from './admin'
import { ProfileSection } from 'components/ProfileSection'

import 'styles/feed.css'
import 'styles/innerPage.css'
import 'styles/popup.css'
import 'styles/settings.css'
import 'styles/styles.css'
import 'styles/write.css'

export const SettingsPage = () => {
  const location = useLocation()
  const userState = useAppSelector((state) => state.user)

  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div className='IBMSecMainGroup IBMSecMainGroupAlt'>
          <div className='IBMSMSplitMain IBMSMSplitMainThree'>
            <SettingTabs />
            {location.pathname === appRoutes.settingsProfile && (
              <ProfileSettings />
            )}
            {location.pathname === appRoutes.settingsRelays && (
              <RelaySettings />
            )}
            {location.pathname === appRoutes.settingsPreferences && (
              <PreferencesSetting />
            )}
            {location.pathname === appRoutes.settingsAdmin && <AdminSetting />}
            {userState.auth && userState.user?.pubkey && (
              <ProfileSection pubkey={userState.user.pubkey as string} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const SettingTabs = () => {
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)
  const userState = useAppSelector((state) => state.user)

  useEffect(() => {
    const adminNpubs = import.meta.env.VITE_ADMIN_NPUBS.split(',')
    if (userState.auth && userState.user?.npub) {
      setIsAdmin(adminNpubs.includes(userState.user.npub as string))
    } else {
      setIsAdmin(false)
    }
  }, [userState])

  const handleSignOut = () => {
    logout()
  }

  const navLinks = [
    { path: appRoutes.settingsProfile, label: 'Profile', icon: <ProfileSVG /> },
    {
      path: appRoutes.settingsRelays,
      label: 'Relays',
      icon: <RelaySVG />
    },
    {
      path: appRoutes.settingsPreferences,
      label: 'Preferences',
      icon: <PreferenceSVG />
    }
  ]

  if (isAdmin) {
    navLinks.push({
      path: appRoutes.settingsAdmin,
      label: 'Admin (WIP)',
      icon: <AdminSVG />
    })
  }

  const renderNavLink = (path: string, label: string, icon: JSX.Element) => (
    <Link
      key={path}
      className={`btn btnMain btnMainAltText btnMainClear ${
        location.pathname === path ? 'btnMainClearActive' : ''
      }`}
      role='button'
      to={path}
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <div className='IBMSMSplitMainSmallSide'>
      <div className='IBMSMSplitMainSmallSideSec'>
        <div className='IBMSMSplitMainSmallSideSec'>
          <h3 className='IBMSMSMSSS_Text'>Settings</h3>
        </div>
        <div className='IBMSMSMSSS_Buttons'>
          {navLinks.map(({ path, label, icon }) =>
            renderNavLink(path, label, icon)
          )}
        </div>

        {userState.auth &&
          userState.auth.method === AuthMethod.Local &&
          userState.auth.localNsec && (
            <div className='inputLabelWrapperMain'>
              <label className='form-label labelMain'>Your Private Key</label>
              <p className='labelDescriptionMain'>
                NOTICE: Make sure you save your private key (nsec) somewhere
                safe.
              </p>
              <div className='inputWrapperMain'>
                <input
                  type='password'
                  className='inputMain inputMainWithBtn'
                  value={userState.auth.localNsec}
                />
                <button
                  className='btn btnMain btnMainInsideField'
                  type='button'
                  onClick={() => {
                    copyTextToClipboard(
                      userState.auth?.localNsec as string
                    ).then((isCopied) => {
                      if (isCopied) toast.success('Nsec copied to clipboard!')
                    })
                  }}
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 512 512'
                    width='1em'
                    height='1em'
                    fill='currentColor'
                  >
                    <use href='#copy-icon'></use>
                  </svg>
                </button>
              </div>
              <p className='labelDescriptionMain'>
                WARNING: Do not sign-out without saving your nsec somewhere
                safe. Otherwise, you'll lose access to your "account".
              </p>
            </div>
          )}

        {userState.auth && (
          <button className='btn btnMain' type='button' onClick={handleSignOut}>
            Sign out
          </button>
        )}
      </div>
    </div>
  )
}
