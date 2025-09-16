import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { InputField } from 'components/Inputs'
import { AlertPopup } from 'components/AlertPopup'
import { Blossom, useBlossomList } from 'hooks/useBlossomList'
import { isValidBlossomServerUrl } from 'utils/mirrorToBlossom'

export const UserServerListSettings = () => {
  const { hostMirrors, setHostMirrors, defaultHostMirrors } = useBlossomList()

  const [newServerUrl, setNewServerUrl] = useState('')
  const [newServerError, setNewServerError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState<string | null>(null)

  /**
   * Validate the blossom server URL
   */
  const validateServerUrl = useCallback(
    (url: string): boolean => {
      if (!url.trim()) {
        setNewServerError('Server URL is required')
        return false
      }

      if (!isValidBlossomServerUrl(url)) {
        setNewServerError('Please enter a valid HTTP/HTTPS URL')
        return false
      }

      // Normalize the URL to ensure consistency
      const normalizedUrl = url.endsWith('/') ? url : `${url}/`

      // Check if the server already exists
      const serverExists = hostMirrors.mirrors.some(
        (mirror: Blossom) => mirror.url === normalizedUrl
      )

      if (serverExists) {
        setNewServerError('This server is already in your list')
        return false
      }

      setNewServerError('')
      return true
    },
    [hostMirrors.mirrors]
  )

  /**
   * Add a new blossom server to the user's list
   */
  const handleAddServer = useCallback(async () => {
    if (!validateServerUrl(newServerUrl)) {
      return
    }

    setIsSaving(true)
    try {
      // Normalize the URL to ensure consistency
      const normalizedUrl = newServerUrl.endsWith('/')
        ? newServerUrl
        : `${newServerUrl}/`

      // Create a new blossom server entry
      const newBlossom: Blossom = {
        id: normalizedUrl,
        url: normalizedUrl,
        isActive: true
      }

      // Add to the user's blossom list
      const updatedMirrors = [...hostMirrors.mirrors, newBlossom]
      setHostMirrors(hostMirrors.mainHost, updatedMirrors)

      setNewServerUrl('')
      toast.success('Server added successfully!')
    } catch (error) {
      console.error('Failed to add server:', error)
      toast.error('Failed to add server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [newServerUrl, hostMirrors, setHostMirrors, validateServerUrl])

  /**
   * Remove a blossom server from the user's list
   */
  const handleRemoveServer = useCallback(
    async (serverId: string) => {
      setIsSaving(true)
      try {
        const updatedMirrors = hostMirrors.mirrors.filter(
          (mirror: Blossom) => mirror.id !== serverId
        )
        setHostMirrors(hostMirrors.mainHost, updatedMirrors)
        toast.success('Server removed successfully!')
      } catch (error) {
        console.error('Failed to remove server:', error)
        toast.error('Failed to remove server. Please try again.')
      } finally {
        setIsSaving(false)
        setShowDeletePopup(null)
      }
    },
    [hostMirrors, setHostMirrors]
  )

  /**
   * Toggle server active status
   */
  const handleToggleServer = useCallback(
    async (serverId: string) => {
      setIsSaving(true)
      try {
        const updatedMirrors = hostMirrors.mirrors.map((mirror: Blossom) =>
          mirror.id === serverId
            ? { ...mirror, isActive: !mirror.isActive }
            : mirror
        )
        setHostMirrors(hostMirrors.mainHost, updatedMirrors)
        toast.success('Server status updated!')
      } catch (error) {
        console.error('Failed to update server status:', error)
        toast.error('Failed to update server status. Please try again.')
      } finally {
        setIsSaving(false)
      }
    },
    [hostMirrors, setHostMirrors]
  )

  /**
   * Reset to default servers
   */
  const handleResetToDefaults = useCallback(async () => {
    setIsSaving(true)
    try {
      setHostMirrors(hostMirrors.mainHost, defaultHostMirrors)
      toast.success('Reset to default servers!')
    } catch (error) {
      console.error('Failed to reset servers:', error)
      toast.error('Failed to reset servers. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [hostMirrors.mainHost, defaultHostMirrors, setHostMirrors])

  /**
   * Handle input change for new server URL
   */
  const handleNewServerUrlChange = (value: string) => {
    setNewServerUrl(value)
    if (newServerError) {
      setNewServerError('')
    }
  }

  return (
    <>
      {isSaving && <LoadingSpinner desc="Updating server list..." />}
      <div className="IBMSMSplitMainFullSideFWMid">
        <div className="IBMSMSplitMainFullSideSec">
          <div className="IBMSMSMBS_Write">
            {/* Header Section */}
            <div className="inputLabelWrapperMain">
              <div className="labelWrapperMain">
                <p className="labelMain">User Server List</p>
              </div>
              <p className="labelDescriptionMain">
                Manage your personal Blossom servers for file uploads and
                storage. These servers will be used as mirrors when uploading
                files to ensure redundancy and availability.
              </p>
            </div>

            {/* Add New Server Section */}
            <div className="inputLabelWrapperMain">
              <InputField
                label="Add New Blossom Server"
                placeholder="https://example.com/"
                name="newServer"
                inputMode="url"
                value={newServerUrl}
                onChange={(_, value) => handleNewServerUrlChange(value)}
                error={newServerError}
              />
              <div
                className="IBMSMSMBS_WriteAction"
                style={{ marginTop: '10px' }}
              >
                <button
                  className="btn btnMain"
                  type="button"
                  onClick={handleAddServer}
                  disabled={isSaving || !newServerUrl.trim()}
                >
                  Add Server
                </button>
              </div>
            </div>

            {/* Current Servers List */}
            <div className="inputLabelWrapperMain">
              <div className="labelWrapperMain">
                <p className="labelMain">
                  Your Servers ({hostMirrors.mirrors.length})
                </p>
              </div>

              {hostMirrors.mirrors.length === 0 ? (
                <p className="labelDescriptionMain">
                  No servers configured. Add a server above to get started.
                </p>
              ) : (
                <div style={{ marginTop: '15px' }}>
                  {hostMirrors.mirrors.map((mirror: Blossom) => (
                    <div
                      key={mirror.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        marginBottom: '10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 0 8px 0 rgb(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                          <strong>{mirror.url}</strong>
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              fontSize: '11px',
                              background: mirror.isActive
                                ? '#28a745'
                                : '#ffc107',
                              color: mirror.isActive ? 'white' : '#212529'
                            }}
                          >
                            {mirror.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className={`btn btnMain btnMainAlt ${mirror.isActive ? 'btnMainAltDanger' : 'btnMainAltSuccess'}`}
                          type="button"
                          onClick={() => handleToggleServer(mirror.id)}
                          disabled={isSaving}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          {mirror.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          className="btn btnMain btnMainAltDanger"
                          type="button"
                          onClick={() => setShowDeletePopup(mirror.id)}
                          disabled={isSaving}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="IBMSMSMBS_WriteAction">
              <button
                className="btn btnMain btnMainAlt"
                type="button"
                onClick={handleResetToDefaults}
                disabled={isSaving}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <AlertPopup
          header="Remove Server"
          label="Are you sure you want to remove this server from your list?"
          handleConfirm={(confirm) => {
            if (confirm && showDeletePopup) {
              handleRemoveServer(showDeletePopup)
            } else {
              setShowDeletePopup(null)
            }
          }}
          handleClose={() => setShowDeletePopup(null)}
        >
          <div className="IBMSMSMBSSWarning">
            <p>
              <strong>Server:</strong>{' '}
              {hostMirrors.mirrors.find((m) => m.id === showDeletePopup)?.url}
            </p>
            <p>
              This action cannot be undone. The server will be removed from your
              personal list and will no longer be used for file mirroring.
            </p>
          </div>
        </AlertPopup>
      )}
    </>
  )
}
