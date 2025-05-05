import { createPortal } from 'react-dom'
import { PropsWithChildren } from 'react'
import { AlertPopupProps } from 'types'

export const AlertPopup = ({
  header,
  label,
  handleConfirm,
  handleClose,
  yesButtonLabel = 'Yes',
  noButtonLabel = 'No',
  children
}: PropsWithChildren<AlertPopupProps>) => {
  return createPortal(
    <div className="popUpMain">
      <div className="ContainerMain">
        <div className="popUpMainCardWrapper">
          <div className="popUpMainCard popUpMainCardQR">
            <div className="popUpMainCardTop">
              <div className="popUpMainCardTopInfo">
                <h3>{header}</h3>
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
              <div className="pUMCB_ZapsInside">
                <div className="inputLabelWrapperMain">
                  <label
                    className="form-label labelMain"
                    style={{ fontWeight: 'bold' }}
                  >
                    {label}
                  </label>
                  {children}
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    gap: '10px'
                  }}
                >
                  <button
                    className="btn btnMain btnMainPopup"
                    type="button"
                    onPointerDown={() => handleConfirm(true)}
                  >
                    {yesButtonLabel}
                  </button>
                  <button
                    className="btn btnMain btnMainPopup"
                    type="button"
                    onPointerDown={() => handleConfirm(false)}
                  >
                    {noButtonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
