import { useAppSelector } from 'hooks'
import { nip19 } from 'nostr-tools'
import { useState } from 'react'
import { NavLink, NavLinkProps } from 'react-router-dom'
import { appRoutes, getProfilePageRoute } from 'routes'
import 'styles/socialNav.css'
import { npubToHex } from 'utils'

export const SocialNav = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const userState = useAppSelector((state) => state.user)

  let profileRoute = ''
  if (userState.auth && userState.user) {
    // Redirect to user's profile is no profile is linked
    const userHexKey = npubToHex(userState.user.npub as string)

    if (userHexKey) {
      profileRoute = getProfilePageRoute(
        nip19.nprofileEncode({
          pubkey: userHexKey
        })
      )
    }
  }
  const toggleNav = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div
      className="socialNav"
      style={{
        transform: isCollapsed ? 'translateX(0)' : 'translateX(50%)',
        right: isCollapsed ? '0%' : '50%'
      }}
    >
      <div className="socialNavInsideWrapper">
        {!isCollapsed && (
          <div className="socialNavInside">
            <NavButton
              to={appRoutes.home}
              viewBox="0 -32 576 576"
              svgPath="M511.8 287.6L512.5 447.7C512.5 450.5 512.3 453.1 512 455.8V472C512 494.1 494.1 512 472 512H456C454.9 512 453.8 511.1 452.7 511.9C451.3 511.1 449.9 512 448.5 512H392C369.9 512 352 494.1 352 472V384C352 366.3 337.7 352 320 352H256C238.3 352 224 366.3 224 384V472C224 494.1 206.1 512 184 512H128.1C126.6 512 125.1 511.9 123.6 511.8C122.4 511.9 121.2 512 120 512H104C81.91 512 64 494.1 64 472V360C64 359.1 64.03 358.1 64.09 357.2V287.6H32.05C14.02 287.6 0 273.5 0 255.5C0 246.5 3.004 238.5 10.01 231.5L266.4 8.016C273.4 1.002 281.4 0 288.4 0C295.4 0 303.4 2.004 309.5 7.014L416 100.7V64C416 46.33 430.3 32 448 32H480C497.7 32 512 46.33 512 64V185L564.8 231.5C572.8 238.5 576.9 246.5 575.8 255.5C575.8 273.5 560.8 287.6 543.8 287.6L511.8 287.6z"
            />
            {!!userState.auth && (
              <>
                <NavButton
                  to={appRoutes.feed}
                  svgPath="M88 48C101.3 48 112 58.75 112 72V120C112 133.3 101.3 144 88 144H40C26.75 144 16 133.3 16 120V72C16 58.75 26.75 48 40 48H88zM480 64C497.7 64 512 78.33 512 96C512 113.7 497.7 128 480 128H192C174.3 128 160 113.7 160 96C160 78.33 174.3 64 192 64H480zM480 224C497.7 224 512 238.3 512 256C512 273.7 497.7 288 480 288H192C174.3 288 160 273.7 160 256C160 238.3 174.3 224 192 224H480zM480 384C497.7 384 512 398.3 512 416C512 433.7 497.7 448 480 448H192C174.3 448 160 433.7 160 416C160 398.3 174.3 384 192 384H480zM16 232C16 218.7 26.75 208 40 208H88C101.3 208 112 218.7 112 232V280C112 293.3 101.3 304 88 304H40C26.75 304 16 293.3 16 280V232zM88 368C101.3 368 112 378.7 112 392V440C112 453.3 101.3 464 88 464H40C26.75 464 16 453.3 16 440V392C16 378.7 26.75 368 40 368H88z"
                />
                <NavButton
                  to={appRoutes.notifications}
                  svgPath="M256 32V51.2C329 66.03 384 130.6 384 208V226.8C384 273.9 401.3 319.2 432.5 354.4L439.9 362.7C448.3 372.2 450.4 385.6 445.2 397.1C440 408.6 428.6 416 416 416H32C19.4 416 7.971 408.6 2.809 397.1C-2.353 385.6-.2883 372.2 8.084 362.7L15.5 354.4C46.74 319.2 64 273.9 64 226.8V208C64 130.6 118.1 66.03 192 51.2V32C192 14.33 206.3 0 224 0C241.7 0 256 14.33 256 32H256zM224 512C207 512 190.7 505.3 178.7 493.3C166.7 481.3 160 464.1 160 448H288C288 464.1 281.3 481.3 269.3 493.3C257.3 505.3 240.1 512 224 512z"
                />
              </>
            )}
            <NavButton
              to={appRoutes.search}
              svgPath="M500.3 443.7l-119.7-119.7c27.22-40.41 40.65-90.9 33.46-144.7C401.8 87.79 326.8 13.32 235.2 1.723C99.01-15.51-15.51 99.01 1.724 235.2c11.6 91.64 86.08 166.7 177.6 178.9c53.8 7.189 104.3-6.236 144.7-33.46l119.7 119.7c15.62 15.62 40.95 15.62 56.57 0C515.9 484.7 515.9 459.3 500.3 443.7zM79.1 208c0-70.58 57.42-128 128-128s128 57.42 128 128c0 70.58-57.42 128-128 128S79.1 278.6 79.1 208z"
            />
            {!!userState.auth && (
              <NavButton
                to={profileRoute}
                svgPath="M256 288c79.53 0 144-64.47 144-144s-64.47-144-144-144c-79.52 0-144 64.47-144 144S176.5 288 256 288zM351.1 320H160c-88.36 0-160 71.63-160 160c0 17.67 14.33 32 31.1 32H480c17.67 0 31.1-14.33 31.1-32C512 391.6 440.4 320 351.1 320z"
              />
            )}
          </div>
        )}
        <div className="socialNavCollapse" onClick={toggleNav}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-128 0 512 512"
            width="1em"
            height="1em"
            fill="currentColor"
            className="socialNavCollapseIcon"
            style={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
            }}
          >
            <path d="M192 448c-8.188 0-16.38-3.125-22.62-9.375l-160-160c-12.5-12.5-12.5-32.75 0-45.25l160-160c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25L77.25 256l137.4 137.4c12.5 12.5 12.5 32.75 0 45.25C208.4 444.9 200.2 448 192 448z"></path>
          </svg>
        </div>
      </div>
    </div>
  )
}

interface NavButtonProps extends NavLinkProps {
  svgPath: string
  viewBox?: string
}

const NavButton = ({
  svgPath,
  viewBox = '0 0 512 512',
  ...rest
}: NavButtonProps) => (
  <NavLink
    {...rest}
    className={({ isActive }) =>
      `btn btnMain socialNavInsideBtn ${
        isActive ? 'socialNavInsideBtnActive' : ''
      }`
    }
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width="1em"
      height="1em"
      fill="currentColor"
    >
      <path d={svgPath}></path>
    </svg>
  </NavLink>
)
