import { Link, useLocation, useRouteError } from 'react-router-dom'
import { appRoutes } from 'routes'

interface NotFoundPageProps {
  title: string
  message: string
}

export const NotFoundPage = ({
  title = 'Page not found',
  message = "The page you're attempting to visit doesn't exist"
}: Partial<NotFoundPageProps>) => {
  const error = useRouteError() as Partial<NotFoundPageProps>

  const location = useLocation()

  return (
    <div className="InnerBodyMain">
      <div className="ContainerMain">
        <div className="IBMSecMainGroup IBMSecMainGroupAlt">
          <div className="IBMSecMain IBMSMListWrapper">
            <div className="IBMSMTitleMain">
              <h2 className="IBMSMTitleMainHeading">{error?.title || title}</h2>
            </div>
            <div>
              <p>{error?.message || message}</p>
            </div>
            <div
              className="IBMSMAction"
              style={{
                gap: '10px'
              }}
            >
              <Link
                to={location.pathname}
                className="btn btnMain IBMSMActionBtn"
                type="button"
              >
                Try again
              </Link>
              <Link
                to={appRoutes.home}
                className="btn btnMain IBMSMActionBtn"
                type="button"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
