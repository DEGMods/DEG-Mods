import { useState, useEffect } from 'react'
import { useMuteLists, useNDKContext } from 'hooks'
import { store } from 'store'
import {
  addHashToBlockList,
  removeHashFromBlockList,
  isValidSha256Hash
} from 'utils'
import { toast } from 'react-toastify'

// todo: use components from Input.tsx
export const AdminSetting = () => {
  const [hashInputs, setHashInputs] = useState<string[]>(['', ''])
  const [isLoading, setIsLoading] = useState(false)
  const muteLists = useMuteLists()
  const { getMuteLists, ...ndkContext } = useNDKContext()

  const userState = store.getState().user
  const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
  const adminHexKey =
    typeof userState.user?.pubkey === 'string'
      ? userState.user.pubkey
      : undefined

  // Function to refresh mute lists data
  const refreshMuteLists = async () => {
    try {
      const pubkey = userState.user?.pubkey as string | undefined
      await getMuteLists(pubkey)
    } catch (error) {
      console.error('Error refreshing mute lists:', error)
    }
  }

  // Initialize hash inputs with existing blocked hashes
  useEffect(() => {
    const existingHashes = muteLists.admin.blockedFileHashes
    if (existingHashes.length > 0) {
      setHashInputs([...existingHashes, '', ''])
    }
  }, [muteLists.admin.blockedFileHashes])

  const handleHashInputChange = (index: number, value: string) => {
    const newInputs = [...hashInputs]
    newInputs[index] = value
    setHashInputs(newInputs)
  }

  const handleAddHashInput = () => {
    setHashInputs([...hashInputs, ''])
  }

  const handleRemoveHashInput = async (index: number) => {
    const hashToRemove = hashInputs[index]

    if (hashToRemove && isValidSha256Hash(hashToRemove) && adminHexKey) {
      setIsLoading(true)
      try {
        await removeHashFromBlockList(
          hashToRemove,
          { getMuteLists, ...ndkContext },
          adminHexKey
        )
        // Refresh the mute lists to get updated data
        await refreshMuteLists()
        // Remove from local state
        const newInputs = hashInputs.filter((_, i) => i !== index)
        setHashInputs(newInputs)
      } catch (error) {
        console.error('Error removing hash:', error)
      } finally {
        setIsLoading(false)
      }
    } else {
      // Just remove empty input
      const newInputs = hashInputs.filter((_, i) => i !== index)
      setHashInputs(newInputs)
    }
  }

  const handleSaveHashes = async () => {
    if (!isAdmin || !adminHexKey) {
      toast.error('Admin access required')
      return
    }

    setIsLoading(true)
    try {
      const validHashes = hashInputs.filter(
        (hash) => hash.trim() && isValidSha256Hash(hash.trim())
      )
      const existingHashes = muteLists.admin.blockedFileHashes

      // Add new hashes and collect them for immediate UI update
      const newlyAddedHashes: string[] = []
      for (const hash of validHashes) {
        const normalizedHash = hash.trim().toLowerCase()
        if (!existingHashes.includes(normalizedHash)) {
          await addHashToBlockList(
            normalizedHash,
            { getMuteLists, ...ndkContext },
            adminHexKey
          )
          newlyAddedHashes.push(normalizedHash)
        }
      }

      // Refresh the mute lists to get updated data
      await refreshMuteLists()

      toast.success('Hash blocklist updated successfully')

      // Immediately update the UI with existing hashes + newly added ones + empty fields
      const allCurrentHashes = [...existingHashes, ...newlyAddedHashes]
      setHashInputs([...allCurrentHashes, '', ''])
    } catch (error) {
      console.error('Error saving hashes:', error)
      toast.error('Failed to update hash blocklist')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="IBMSMSplitMainFullSideFWMid">
      <div className="IBMSMSplitMainFullSideSec">
        <div className="IBMSMSMBS_Write">
          <div className="inputLabelWrapperMain">
            <div className="labelWrapperMain">
              <p className="labelMain">Slider Featured Mods</p>
              <button className="btn btnMain btnMainAdd" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Note ID"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Note ID"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="inputLabelWrapperMain">
            <div className="labelWrapperMain">
              <p className="labelMain">Featured Games</p>
              <button className="btn btnMain btnMainAdd" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Game name"
                value="Witcher 3: Wild Hunt"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Game name"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="inputLabelWrapperMain">
            <div className="labelWrapperMain">
              <p className="labelMain">Featured Mods</p>
              <button className="btn btnMain btnMainAdd" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Note ID"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="Note ID"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="inputLabelWrapperMain">
            <div className="labelWrapperMain">
              <p className="labelMain">Blog writers</p>
              <button className="btn btnMain btnMainAdd" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="nPubs"
                value="npub18n4ysp43ux5c98fs6h9c57qpr4p8r3j8f6e32v0vj8egzy878aqqyzzk9r"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
            <div className="inputWrapperMain">
              <input
                type="text"
                className="inputMain"
                inputMode="url"
                placeholder="nPubs"
              />
              <button className="btn btnMain btnMainRemove" type="button">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                </svg>
              </button>
            </div>
          </div>
          <div className="inputLabelWrapperMain">
            <div className="labelWrapperMain">
              <p className="labelMain">
                Blocked File Hashes (SHA256)
                {muteLists.admin.blockedFileHashes.length > 0 && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginLeft: '8px'
                    }}
                  >
                    ({muteLists.admin.blockedFileHashes.length} currently
                    blocked)
                  </span>
                )}
              </p>
              <button
                className="btn btnMain btnMainAdd"
                type="button"
                onClick={handleAddHashInput}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="-32 0 512 512"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                >
                  <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
                </svg>
              </button>
            </div>
            {hashInputs.map((hash, index) => (
              <div key={index} className="inputWrapperMain">
                <input
                  type="text"
                  className="inputMain"
                  inputMode="text"
                  placeholder="SHA256 hash (64 characters)"
                  pattern="[a-fA-F0-9]{64}"
                  maxLength={64}
                  value={hash}
                  onChange={(e) => handleHashInputChange(index, e.target.value)}
                  disabled={isLoading}
                  style={{
                    borderColor:
                      hash && !isValidSha256Hash(hash) ? '#dc3545' : undefined
                  }}
                />
                <button
                  className="btn btnMain btnMainRemove"
                  type="button"
                  onClick={() => handleRemoveHashInput(index)}
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="-32 0 512 512"
                    width="1em"
                    height="1em"
                    fill="currentColor"
                  >
                    <path d="M135.2 17.69C140.6 6.848 151.7 0 163.8 0H284.2C296.3 0 307.4 6.848 312.8 17.69L320 32H416C433.7 32 448 46.33 448 64C448 81.67 433.7 96 416 96H32C14.33 96 0 81.67 0 64C0 46.33 14.33 32 32 32H128L135.2 17.69zM394.8 466.1C393.2 492.3 372.3 512 346.9 512H101.1C75.75 512 54.77 492.3 53.19 466.1L31.1 128H416L394.8 466.1z"></path>
                  </svg>
                </button>
              </div>
            ))}
            {hashInputs.some((hash) => hash && !isValidSha256Hash(hash)) && (
              <div
                style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}
              >
                Invalid hash format. SHA256 hashes must be exactly 64
                hexadecimal characters.
              </div>
            )}
          </div>
          <div className="IBMSMSMBS_WriteAction">
            <button
              className="btn btnMain"
              type="button"
              onClick={handleSaveHashes}
              disabled={isLoading || !isAdmin}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
