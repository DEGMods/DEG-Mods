import { useFetcher } from 'react-router-dom'
import { CheckboxFieldUncontrolled } from 'components/Inputs'
import { useEffect } from 'react'
import { ReportReason } from 'types/report'
import { LoadingSpinner } from './LoadingSpinner'
import { PopupProps } from 'types'

type ReportPopupProps = {
  openedAt: number
  reasons: ReportReason[]
} & PopupProps

export const ReportPopup = ({
  openedAt,
  reasons,
  handleClose
}: ReportPopupProps) => {
  // Use openedAt to allow for multiple reports
  // by default, fetcher will remember the data
  const fetcher = useFetcher({ key: openedAt.toString() })

  // Close automatically if action succeeds
  useEffect(() => {
    if (fetcher.data) {
      const { isSent } = fetcher.data
      if (isSent) {
        handleClose()
      }
    }
  }, [fetcher, handleClose])

  return (
    <>
      {fetcher.state !== 'idle' && <LoadingSpinner desc={''} />}
      <div className="popUpMain">
        <div className="ContainerMain">
          <div className="popUpMainCardWrapper">
            <div className="popUpMainCard popUpMainCardQR">
              <div className="popUpMainCardTop">
                <div className="popUpMainCardTopInfo">
                  <h3>Report Post</h3>
                </div>
                <div className="popUpMainCardTopClose" onClick={handleClose}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="-96 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                    style={{ zIndex: 1 }}
                  >
                    <path d="M310.6 361.4c12.5 12.5 12.5 32.75 0 45.25C304.4 412.9 296.2 416 288 416s-16.38-3.125-22.62-9.375L160 301.3L54.63 406.6C48.38 412.9 40.19 416 32 416S15.63 412.9 9.375 406.6c-12.5-12.5-12.5-32.75 0-45.25l105.4-105.4L9.375 150.6c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0L160 210.8l105.4-105.4c12.5-12.5 32.75-12.5 45.25 0s12.5 32.75 0 45.25l-105.4 105.4L310.6 361.4z"></path>
                  </svg>
                </div>
              </div>
              <div className="pUMCB_Zaps">
                <fetcher.Form
                  className="pUMCB_ZapsInside"
                  method="post"
                  action="report"
                >
                  <div className="inputLabelWrapperMain">
                    <label
                      className="form-label labelMain"
                      style={{ fontWeight: 'bold' }}
                    >
                      Why are you reporting this?
                    </label>
                    {reasons.map((r) => (
                      <CheckboxFieldUncontrolled
                        key={r.key}
                        label={r.label}
                        name={r.key}
                        defaultChecked={false}
                      />
                    ))}
                  </div>
                  <button
                    className="btn btnMain pUMCB_Report"
                    type="submit"
                    style={{ width: '100%' }}
                  >
                    Submit Report
                  </button>
                </fetcher.Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
