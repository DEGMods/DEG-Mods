import { AlertPopup } from 'components/AlertPopup'
import { InputField } from 'components/Inputs'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { useLocalStorage } from 'hooks'
import { useEffect, useState } from 'react'
import { ServerService } from 'controllers/server'
import { SERVER_URL_STORAGE_KEY } from '../../constants'
import { useServer } from 'hooks/useServer'

export const ServerSetting = () => {
  const server = useServer()
  const [serverUrl] = useLocalStorage(
    SERVER_URL_STORAGE_KEY,
    import.meta.env.VITE_DEFAULT_SERVER || 'http://localhost:3000'
  )
  const [url, setUrl] = useState(serverUrl)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showAlertPopup, setShowAlertPopup] = useState<boolean>(false)

  const handleReset = async () => {
    const serverService = ServerService.getInstance()
    await serverService.setServerUrl(import.meta.env.VITE_DEFAULT_SERVER)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (url.trim() === '') {
        setShowAlertPopup(true)
        return
      }
      const serverService = ServerService.getInstance()
      await serverService.setServerUrl(url.trim())
      setError('')
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Something went wrong.')
      }
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => setUrl(serverUrl), [serverUrl])

  return (
    <>
      {isSaving && <LoadingSpinner desc={''} />}
      <div className='IBMSMSplitMainFullSideFWMid'>
        <div className='IBMSMSplitMainFullSideSec'>
          <div className='IBMSMSMBS_Write'>
            <div className='inputLabelWrapperMain'>
              <div className='labelWrapperMain'>
                <p className='labelMain'>Server</p>
              </div>
              <p className='labelDescriptionMain'>
                The server aggregates the mods and blogs to reduce load on the
                browsers. Changing the server connection URL will heavily affect
                your experience on the site.
              </p>
              {serverUrl !== '' && (
                <>
                  <p className='labelDescriptionMain'>
                    Used URLs:
                    <br />
                    <code>
                      {serverUrl}/health
                      <br />
                      {serverUrl}/paginated-events
                    </code>
                  </p>
                </>
              )}
              <InputField
                label='Server connection URL'
                placeholder=''
                name='server'
                inputMode='url'
                value={url}
                onChange={(_, value) => setUrl(value)}
                error={error}
              />
            </div>
            <div className='IBMSMSMBS_WriteAction'>
              <code>{server.state.toUpperCase()}</code>

              <button
                className='btn btnMain'
                type='button'
                onClick={handleReset}
                disabled={isSaving}
              >
                Default
              </button>
              <button
                className='btn btnMain'
                type='button'
                onClick={handleSave}
                disabled={isSaving}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      {showAlertPopup && (
        <AlertPopup
          header='Server connection'
          label='Are you sure you want to remove server URL?'
          handleConfirm={(confirm) => {
            if (confirm) {
              const serverService = ServerService.getInstance()
              serverService.disable()
            } else {
              setUrl(serverUrl)
            }
            setShowAlertPopup(false)
          }}
          handleClose={() => setShowAlertPopup(false)}
        >
          <div className='IBMSMSMBSSWarning'>
            <p>
              Warning: Expect a worse experience on the site if you remove
              default server URL.
            </p>
          </div>
        </AlertPopup>
      )}
    </>
  )
}
