import {
  Event,
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  kinds,
  nip04,
  nip19,
  UnsignedEvent
} from 'nostr-tools'
import { toast } from 'react-toastify'
import { log, LogType } from './utils'
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk'

/**
 * Get the current time in seconds since the Unix epoch (January 1, 1970).
 *
 * This function retrieves the current time in milliseconds since the Unix epoch
 * using `Date.now()` and then converts it to seconds by dividing by 1000.
 * Finally, it rounds the result to the nearest whole number using `Math.round()`.
 *
 * @returns {number} The current time in seconds since the Unix epoch.
 */
export const now = (): number => Math.round(Date.now() / 1000)

/**
 * Converts a hexadecimal public key to an npub format.
 * If the input is already in npub format, it returns the input unchanged.
 *
 * @param {string} hexPubkey - The hexadecimal public key to be converted.
 * @returns {`npub1${string}`} - The public key in npub format.
 */
export const hexToNpub = (hexPubkey: string): `npub1${string}` => {
  // Check if the input is already in npub format and return it unchanged if true
  if (hexPubkey.startsWith('npub1')) return hexPubkey as `npub1${string}`

  // Convert the hexadecimal public key to npub format using the nip19 encoder
  return nip19.npubEncode(hexPubkey)
}

/**
 * Retrieves the value associated with a specific tag identifier from an event.
 *
 * This function searches the `tags` array of an event to find a tag that matches the given
 * `tagIdentifier`. If a matching tag is found, it returns the associated value(s).
 * If no matching tag is found, it returns `null`.
 *
 * @param event - The event object containing the tags.
 * @param tagIdentifier - The identifier of the tag to search for.
 * @returns {string | null} The value(s) associated with the specified tag identifier, or `null` if the tag is not found.
 */
export const getTagValue = (
  event: Event | NDKEvent,
  tagIdentifier: string
): string[] | null => {
  // Find the tag in the event's tags array where the first element matches the tagIdentifier.
  const tag = event.tags.find((item) => item[0] === tagIdentifier)

  // If a matching tag is found, return the rest of the elements in the tag (i.e., the values).
  if (tag) {
    return tag.slice(1) // Slice to remove the identifier, returning only the values.
  }

  // Return null if no matching tag is found.
  return null
}

export const getTagValues = (
  event: Event | NDKEvent,
  tagIdentifier: string
): string[] | null => {
  // Find the tag in the event's tags array where the first element matches the tagIdentifier.
  const tags = event.tags.filter((item) => item[0] === tagIdentifier)

  // If a matching tag is found, return the rest of the elements in the tag (i.e., the values).
  if (tags && tags.length) {
    return tags.map((item) => item[1]) // Returning only the values
  }

  // Return null if no matching tag is found.
  return null
}

export const getFirstTagValue = (
  event: Event | NDKEvent,
  tagIdentifier: string
) => {
  const tags = getTagValues(event, tagIdentifier)
  return tags && tags.length ? tags[0] : undefined
}

export const getFirstTagValueAsInt = (
  event: Event | NDKEvent,
  tagIdentifier: string
) => {
  const value = getFirstTagValue(event, tagIdentifier)
  return value ? parseInt(value, 10) : undefined
}

/**
 * @param hexKey hex private or public key
 * @returns whether or not is key valid
 */
const validateHex = (hexKey: string) => {
  return hexKey.match(/^[a-f0-9]{64}$/)
}

/**
 * NPUB provided - it will convert NPUB to HEX
 * HEX provided - it will return HEX
 *
 * @param pubKey in NPUB, HEX format
 * @returns HEX format
 */
export const npubToHex = (pubKey: string): string | null => {
  // If key is NPUB
  if (pubKey.startsWith('npub1')) {
    try {
      return nip19.decode(pubKey).data as string
    } catch (error) {
      return null
    }
  }

  // valid hex key
  if (validateHex(pubKey)) return pubKey

  // Not a valid hex key
  return null
}

/**
 * Extracts the zap amount from an event object.
 *
 * @param event - The event object from which the zap amount needs to be extracted.
 * @returns The zap amount in the form of a number, converted from the extracted data, or 0 if the amount cannot be determined.
 */
export const extractZapAmount = (event: Event): number => {
  // Find the 'amount' tag within the parsed description's tags
  const amountTag = event.tags.find(
    (tag) => tag[0] === 'amount' && typeof tag[1] === 'string'
  )

  // If the 'amount' tag is found and it has a valid value, convert it to an integer and return
  if (amountTag && amountTag[1]) return parseInt(amountTag[1]) / 1000

  // Return 0 if the zap amount cannot be determined
  return 0
}

/**
 * Signs and publishes an event to user's relays.
 *
 * @param  unsignedEvent - The event object  which needs to be signed before publishing.
 * @returns - A promise that resolves to boolean indicating whether the event was successfully signed and published
 */
export const signAndPublish = async (
  unsignedEvent: UnsignedEvent,
  ndk: NDK,
  publish: (event: NDKEvent) => Promise<string[]>
) => {
  // Sign the event. This returns a signed event or null if signing fails.
  const signedEvent = await window.nostr
    ?.signEvent(unsignedEvent)
    .then((event) => event as Event)
    .catch((err) => {
      // If signing the event fails, display an error toast and log the error.
      toast.error('Failed to sign the event!')
      log(true, LogType.Error, 'Failed to sign the event!', err)
      return null
    })

  // If the event couldn't be signed, exit the function and return null.
  if (!signedEvent) return false

  // Publish the signed event to the relays.
  // This returns an array of relay URLs where the event was successfully published.
  const ndkEvent = new NDKEvent(ndk, signedEvent)
  const publishedOnRelays = await publish(ndkEvent)

  // Handle cases where publishing to the relays failed
  if (publishedOnRelays.length === 0) {
    // Display an error toast if the event could not be published to any relay.
    toast.error('Failed to publish event on any relay')
    return false
  }

  // Display a success toast with the list of relays where the event was successfully published.
  toast.success(
    `Event published successfully to the following relays\n\n${publishedOnRelays.join(
      '\n'
    )}`
  )

  return true
}

/**
 * Sends an encrypted direct message (DM) to a receiver using a randomly generated secret key.
 *
 * @param message - The plaintext message content to be sent.
 * @param receiver - The public key of the receiver to whom the message is being sent.
 * @returns - A promise that resolves to true if the message was successfully sent, or false if an error occurred.
 */
export const sendDMUsingRandomKey = async (
  message: string,
  receiver: string,
  ndk: NDK,
  publish: (event: NDKEvent) => Promise<string[]>
) => {
  // Generate a random secret key for encrypting the message
  const secretKey = generateSecretKey()

  // Encrypt the message using the generated secret key and the receiver's public key
  const encryptedMessage = await nip04
    .encrypt(secretKey, receiver, message)
    .catch((err) => {
      // If encryption fails, display an error toast
      toast.error(
        `An error occurred in encrypting message content: ${err.message || err}`
      )
      return null
    })

  // If encryption failed, exit the function and return false
  if (!encryptedMessage) return false

  // Construct the unsigned event containing the encrypted message and relevant metadata
  const unsignedEvent: UnsignedEvent = {
    pubkey: getPublicKey(secretKey),
    kind: kinds.EncryptedDirectMessage,
    created_at: now(),
    tags: [['p', receiver]],
    content: encryptedMessage
  }

  // Finalize and sign the event using the generated secret key
  const signedEvent = finalizeEvent(unsignedEvent, secretKey)

  const ndkEvent = new NDKEvent(ndk, signedEvent)
  const publishedOnRelays = await publish(ndkEvent)

  // Handle cases where publishing to the relays failed
  if (publishedOnRelays.length === 0) {
    // Display an error toast if the event could not be published to any relay
    toast.error('Failed to publish encrypted direct message on any relay')
    return false
  }

  // Display a success toast if the event was successfully published to one or more relays
  toast.success(`Report successfully submitted!`)

  // Return true indicating that the DM was successfully sent
  return true
}

/**
 * Orders an array of NDKEvent objects chronologically based on their `created_at` property.
 *
 * @param events - The array of NDKEvent objects to be sorted.
 * @param reverse - Optional flag to reverse the sorting order.
 * If true, sorts in ascending order (oldest first), otherwise sorts in descending order (newest first).
 *
 * @returns The sorted array of events.
 */
export function orderEventsChronologically(
  events: NDKEvent[],
  reverse: boolean = false
): NDKEvent[] {
  events.sort((e1: NDKEvent, e2: NDKEvent) => {
    if (reverse) return e1.created_at! - e2.created_at!
    else return e2.created_at! - e1.created_at!
  })

  return events
}
