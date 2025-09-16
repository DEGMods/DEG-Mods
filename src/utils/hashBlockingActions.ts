import { NDKFilter } from '@nostr-dev-kit/ndk'
import { HASH_BLOCK_LIST_KIND, HASH_BLOCK_TAG } from 'constants.ts'
import { NDKContextType } from 'contexts/NDKContext'
import { UnsignedEvent } from 'nostr-tools'
import { toast } from 'react-toastify'
import { UserRelaysType } from 'types'
import {
  extractHashFromUrl,
  isValidSha256Hash,
  now,
  signAndPublish
} from 'utils'

/**
 * Adds a file hash to the admin's hash block list
 * @param hash - The SHA256 hash to block
 * @param ndkContext - NDK context for blockchain operations
 * @param adminHexKey - Admin's hex public key
 * @returns Promise<boolean> - Success status
 */
export const addHashToBlockList = async (
  hash: string,
  ndkContext: NDKContextType,
  adminHexKey: string
): Promise<boolean> => {
  if (!isValidSha256Hash(hash)) {
    toast.error('Invalid SHA256 hash format')
    return false
  }

  const normalizedHash = hash.toLowerCase()

  const filter: NDKFilter = {
    kinds: [HASH_BLOCK_LIST_KIND],
    authors: [adminHexKey],
    '#d': [HASH_BLOCK_TAG]
  }

  const hashBlockListEvent = await ndkContext.fetchEventFromUserRelays(
    filter,
    adminHexKey,
    UserRelaysType.Write
  )

  let unsignedEvent: UnsignedEvent

  if (hashBlockListEvent) {
    const tags = hashBlockListEvent.tags
    const alreadyExists =
      tags.findIndex(
        (item) => item[0] === 'x' && item[1].toLowerCase() === normalizedHash
      ) !== -1

    if (alreadyExists) {
      toast.warn('Hash is already in block list')
      return false
    }

    tags.push(['x', normalizedHash])
    unsignedEvent = {
      pubkey: hashBlockListEvent.pubkey,
      kind: HASH_BLOCK_LIST_KIND,
      content: hashBlockListEvent.content,
      created_at: now(),
      tags: [...tags]
    }
  } else {
    unsignedEvent = {
      pubkey: adminHexKey,
      kind: HASH_BLOCK_LIST_KIND,
      content: '',
      created_at: now(),
      tags: [
        ['d', HASH_BLOCK_TAG],
        ['x', normalizedHash]
      ]
    }
  }

  const isUpdated = await signAndPublish(
    unsignedEvent,
    ndkContext.ndk,
    ndkContext.publish
  )

  if (isUpdated) {
    toast.success('Hash blocked successfully')
    return true
  } else {
    toast.error('Failed to update hash block list')
    return false
  }
}

/**
 * Removes a file hash from the admin's hash block list
 * @param hash - The SHA256 hash to unblock
 * @param ndkContext - NDK context for blockchain operations
 * @param adminHexKey - Admin's hex public key
 * @returns Promise<boolean> - Success status
 */
export const removeHashFromBlockList = async (
  hash: string,
  ndkContext: NDKContextType,
  adminHexKey: string
): Promise<boolean> => {
  if (!isValidSha256Hash(hash)) {
    toast.error('Invalid SHA256 hash format')
    return false
  }

  const normalizedHash = hash.toLowerCase()

  const filter: NDKFilter = {
    kinds: [HASH_BLOCK_LIST_KIND],
    authors: [adminHexKey],
    '#d': [HASH_BLOCK_TAG]
  }

  const hashBlockListEvent = await ndkContext.fetchEventFromUserRelays(
    filter,
    adminHexKey,
    UserRelaysType.Write
  )

  if (!hashBlockListEvent) {
    toast.error("Couldn't get hash block list event from relays")
    return false
  }

  const tags = hashBlockListEvent.tags
  const filteredTags = tags.filter((item) => {
    if (item[0] === 'd' && item[1] === HASH_BLOCK_TAG) {
      return true
    }
    return !(item[0] === 'x' && item[1].toLowerCase() === normalizedHash)
  })

  const unsignedEvent: UnsignedEvent = {
    pubkey: hashBlockListEvent.pubkey,
    kind: HASH_BLOCK_LIST_KIND,
    content: hashBlockListEvent.content,
    created_at: now(),
    tags: filteredTags
  }

  const isUpdated = await signAndPublish(
    unsignedEvent,
    ndkContext.ndk,
    ndkContext.publish
  )

  if (isUpdated) {
    toast.success('Hash unblocked successfully')
    return true
  } else {
    toast.error('Failed to update hash block list')
    return false
  }
}

/**
 * Blocks a file hash extracted from a URL
 * @param url - The URL containing the hash to block
 * @param ndkContext - NDK context for blockchain operations
 * @param adminHexKey - Admin's hex public key
 * @returns Promise<boolean> - Success status
 */
export const blockHashFromUrl = async (
  url: string,
  ndkContext: NDKContextType,
  adminHexKey: string
): Promise<boolean> => {
  const hash = extractHashFromUrl(url)
  if (!hash) {
    toast.error('No valid SHA256 hash found in URL')
    return false
  }

  return addHashToBlockList(hash, ndkContext, adminHexKey)
}

/**
 * Unblocks a file hash extracted from a URL
 * @param url - The URL containing the hash to unblock
 * @param ndkContext - NDK context for blockchain operations
 * @param adminHexKey - Admin's hex public key
 * @returns Promise<boolean> - Success status
 */
export const unblockHashFromUrl = async (
  url: string,
  ndkContext: NDKContextType,
  adminHexKey: string
): Promise<boolean> => {
  const hash = extractHashFromUrl(url)
  if (!hash) {
    toast.error('No valid SHA256 hash found in URL')
    return false
  }

  return removeHashFromBlockList(hash, ndkContext, adminHexKey)
}
