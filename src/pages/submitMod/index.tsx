import { LoadingSpinner, TimerLoadingSpinner } from 'components/LoadingSpinner'
import { ModForm } from 'components/ModForm'
import { ProfileSection } from 'components/ProfileSection'
import { useAppSelector } from 'hooks'
import { useLoaderData, useNavigation } from 'react-router-dom'
import { ModPageLoaderResult } from 'types'

export const SubmitModPage = () => {
  const data = useLoaderData() as ModPageLoaderResult
  const mod = data?.mod
  const navigation = useNavigation()
  const userState = useAppSelector((state) => state.user)
  const title = mod ? 'Edit Mod' : 'Submit a mod'
  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup IBMSecMainGroupAlt">
          <div className="IBMSMSplitMain">
            <div className="IBMSMSplitMainBigSide">
              <div className="IBMSMTitleMain">
                <h2 className="IBMSMTitleMainHeading">{title}</h2>
              </div>
              {navigation.state === 'loading' && (
                <LoadingSpinner desc="Fetching mod details from relays" />
              )}
              {navigation.state === 'submitting' && (
                <TimerLoadingSpinner timeoutMs={10000} countdownMs={30000}>
                  Publishing mod to relays
                </TimerLoadingSpinner>
              )}
              <ModForm />
            </div>
            {userState.auth && userState.user?.pubkey && (
              <ProfileSection pubkey={userState.user.pubkey as string} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
