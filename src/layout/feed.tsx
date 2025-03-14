import { Profile } from 'components/ProfileSection'
import { useAppSelector } from 'hooks'
import { Navigate, Outlet } from 'react-router-dom'
import { appRoutes } from 'routes'

export const FeedLayout = () => {
  const userState = useAppSelector((state) => state.user)
  if (!userState.user?.pubkey) return <Navigate to={appRoutes.home} />

  return (
    <div className='InnerBodyMain'>
      <div className='ContainerMain'>
        <div className='IBMSecMainGroup IBMSecMainGroupAlt'>
          <div className='IBMSMSplitMain'>
            <div className='IBMSMSplitMainFullSide'>
              <div className='IBMSMSplitMainFullSideFeedWrapper'>
                <div className='IBMSMSplitMainFullSideFWSide'>
                  {userState.auth && userState.user?.pubkey && (
                      <div className='IBMSMSplitMainSmallSideSecWrapper'>
                        <div className='IBMSMSplitMainSmallSideSec'>
                          <Profile pubkey={userState.user.pubkey as string} />
                        </div>
                      </div>
                  )}
                </div>
                <div className='IBMSMSplitMainFullSideFWMid'>
                  <Outlet />
                </div>
                <div className='IBMSMSplitMainFullSideFWSide'>
                  <div className='IBMSMSplitMainSmallSideSecWrapper'>
                    <div className='IBMSMSplitMainSmallSideSecBox'><p>This is a box</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
