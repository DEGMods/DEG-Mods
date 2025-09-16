import React, { useState } from 'react'
import { useNDKContext, useMuteLists } from 'hooks'
import { store } from 'store'
import {
  blockHashFromUrl,
  unblockHashFromUrl,
  addHashToBlockList,
  removeHashFromBlockList,
  extractHashFromUrl,
  isValidSha256Hash
} from 'utils'
import { toast } from 'react-toastify'

interface HashBlockingControlsProps {
  /** URL to extract hash from and block/unblock */
  url?: string
  /** Direct hash to block/unblock */
  hash?: string
  /** Show as button or dropdown item */
  variant?: 'button' | 'dropdown'
  /** Custom className */
  className?: string
}

export const HashBlockingControls: React.FC<HashBlockingControlsProps> = ({
  url,
  hash,
  variant = 'button',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const muteLists = useMuteLists()
  const ndkContext = useNDKContext()

  const userState = store.getState().user
  const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
  const adminHexKey =
    typeof userState.user?.pubkey === 'string'
      ? userState.user.pubkey
      : undefined

  if (!isAdmin || !adminHexKey) {
    return null
  }

  // Determine the hash to work with
  const targetHash = hash || (url ? extractHashFromUrl(url) : null)
  if (!targetHash) {
    return null
  }

  // Check if hash is currently blocked
  const isBlocked = muteLists.admin.blockedFileHashes.includes(
    targetHash.toLowerCase()
  )

  const handleToggleBlock = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      let success = false

      if (isBlocked) {
        // Unblock
        if (url) {
          success = await unblockHashFromUrl(url, ndkContext, adminHexKey)
        } else if (hash) {
          success = await removeHashFromBlockList(hash, ndkContext, adminHexKey)
        }
      } else {
        // Block
        if (url) {
          success = await blockHashFromUrl(url, ndkContext, adminHexKey)
        } else if (hash) {
          success = await addHashToBlockList(hash, ndkContext, adminHexKey)
        }
      }

      if (success) {
        // Refresh mute lists to update UI
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Hash blocking error:', error)
      toast.error('Failed to update hash block list')
    } finally {
      setIsLoading(false)
    }
  }

  const buttonText = isBlocked ? 'Unblock Hash' : 'Block Hash'
  const buttonColor = isBlocked ? '#28a745' : '#dc3545'

  if (variant === 'dropdown') {
    return (
      <a
        className={`dropdown-item dropdownMainMenuItem ${className}`}
        onClick={handleToggleBlock}
        style={{ color: buttonColor, cursor: isLoading ? 'wait' : 'pointer' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width="1em"
          height="1em"
          fill="currentColor"
          className="IBMSMSMSSS_Author_Top_Icon"
        >
          <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zM256 464c-114.7 0-208-93.31-208-208S141.3 48 256 48s208 93.31 208 208S370.7 464 256 464zM256 304c13.25 0 24-10.75 24-24v-128C280 138.8 269.3 128 256 128S232 138.8 232 152v128C232 293.3 242.8 304 256 304zM256 337.1c-17.36 0-31.44 14.08-31.44 31.44C224.6 385.9 238.6 400 256 400s31.44-14.08 31.44-31.44C287.4 351.2 273.4 337.1 256 337.1z"></path>
        </svg>
        {isLoading ? 'Processing...' : buttonText}
      </a>
    )
  }

  return (
    <button
      className={`btn ${isBlocked ? 'btn-success' : 'btn-danger'} ${className}`}
      onClick={handleToggleBlock}
      disabled={isLoading}
      title={`${buttonText} (${targetHash.substring(0, 8)}...)`}
    >
      {isLoading ? 'Processing...' : buttonText}
    </button>
  )
}

interface HashInputControlsProps {
  /** Callback when hash is successfully blocked/unblocked */
  onHashUpdated?: () => void
}

export const HashInputControls: React.FC<HashInputControlsProps> = ({
  onHashUpdated
}) => {
  const [hashInput, setHashInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const ndkContext = useNDKContext()

  const userState = store.getState().user
  const isAdmin = userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB
  const adminHexKey =
    typeof userState.user?.pubkey === 'string'
      ? userState.user.pubkey
      : undefined

  if (!isAdmin || !adminHexKey) {
    return null
  }

  const handleAddHash = async () => {
    if (!hashInput.trim()) {
      toast.error('Please enter a hash')
      return
    }

    if (!isValidSha256Hash(hashInput.trim())) {
      toast.error('Please enter a valid SHA256 hash (64 hex characters)')
      return
    }

    setIsLoading(true)
    try {
      const success = await addHashToBlockList(
        hashInput.trim(),
        ndkContext,
        adminHexKey
      )
      if (success) {
        setHashInput('')
        onHashUpdated?.()
      }
    } catch (error) {
      console.error('Hash blocking error:', error)
      toast.error('Failed to block hash')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="d-flex gap-2 mb-3">
      <input
        type="text"
        className="form-control"
        placeholder="Enter SHA256 hash (64 characters)"
        value={hashInput}
        onChange={(e) => setHashInput(e.target.value)}
        pattern="[a-fA-F0-9]{64}"
        maxLength={64}
        disabled={isLoading}
      />
      <button
        className="btn btn-primary"
        onClick={handleAddHash}
        disabled={isLoading || !hashInput.trim()}
      >
        {isLoading ? 'Adding...' : 'Block Hash'}
      </button>
    </div>
  )
}
