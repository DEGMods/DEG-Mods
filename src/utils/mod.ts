import { NDKEvent } from '@nostr-dev-kit/ndk'
import { Event } from 'nostr-tools'
import { ModDetails, ModFormState } from '../types'
import { getTagValue, getTagValues } from './nostr'

/**
 * Extracts and normalizes mod data from an event.
 *
 * This function extracts specific tag values from an event and maps them to properties
 * of a `PageData` object. It handles default values and type conversions as needed.
 *
 * @param event - The event object from which to extract data.
 * @returns A `Partial<PageData>` object containing extracted data.
 */
export const extractModData = (event: Event | NDKEvent): ModDetails => {
  // Helper function to safely get the first value of a tag or return a default value
  const getFirstTagValue = (tagIdentifier: string, defaultValue = '') => {
    const tagValue = getTagValue(event, tagIdentifier)
    return tagValue ? tagValue[0] : defaultValue
  }

  // Helper function to safely parse integer values from tags
  const getIntTagValue = (tagIdentifier: string, defaultValue: number = -1) => {
    const tagValue = getTagValue(event, tagIdentifier)
    return tagValue ? parseInt(tagValue[0], 10) : defaultValue
  }

  return {
    id: event.id,
    dTag: getFirstTagValue('d'),
    aTag: getFirstTagValue('a'),
    rTag: getFirstTagValue('r'),
    author: event.pubkey,
    edited_at: event.created_at!,
    body: event.content,
    published_at: getIntTagValue('published_at'),
    game: getFirstTagValue('game'),
    title: getFirstTagValue('title'),
    featuredImageUrl: getFirstTagValue('featuredImageUrl'),
    summary: getFirstTagValue('summary'),
    nsfw: getFirstTagValue('nsfw') === 'true',
    repost: getFirstTagValue('repost') === 'true',
    originalAuthor: getFirstTagValue('originalAuthor'),
    screenshotsUrls: getTagValue(event, 'screenshotsUrls') || [],
    tags: getTagValue(event, 'tags') || [],
    LTags: (getTagValues(event, 'L') || []).map((t) =>
      t.replace('com.degmods:', '')
    ),
    lTags: (getTagValues(event, 'l') || []).map((t) =>
      t.replace('com.degmods:', '')
    ),
    downloadUrls: (getTagValue(event, 'downloadUrls') || []).map((item) =>
      JSON.parse(item)
    )
  }
}

/**
 * Constructs a list of `ModDetails` objects from an array of events.
 *
 * This function filters out events that do not contain all required data,
 * extracts the necessary information from the valid events, and constructs
 * `ModDetails` objects.
 *
 * @param events - The array of event objects to be processed.
 * @returns An array of `ModDetails` objects constructed from valid events.
 */
export const constructModListFromEvents = (
  events: Event[] | NDKEvent[]
): ModDetails[] => {
  // Filter and extract mod details from events
  const modDetailsList: ModDetails[] = events
    .filter(isModDataComplete) // Filter out incomplete events
    .map((event) => extractModData(event)) // Extract data and construct ModDetails

  return modDetailsList
}

/**
 * Checks if the provided event contains all the required data for constructing a `ModDetails` object.
 *
 * This function verifies that the event has the necessary tags and values to construct a `ModDetails` object.
 *
 * @param event - The event object to be checked.
 * @returns `true` if the event contains all required data; `false` otherwise.
 */
export const isModDataComplete = (event: Event | NDKEvent): boolean => {
  // Helper function to check if a tag value is present and not empty
  const hasTagValue = (tagIdentifier: string): boolean => {
    const value = getTagValue(event, tagIdentifier)
    return !!value && value.length > 0 && value[0].trim() !== ''
  }

  // Check if all required fields are present
  return (
    hasTagValue('d') &&
    hasTagValue('a') &&
    hasTagValue('t') &&
    hasTagValue('published_at') &&
    hasTagValue('game') &&
    hasTagValue('title') &&
    hasTagValue('featuredImageUrl') &&
    hasTagValue('summary') &&
    hasTagValue('nsfw') &&
    getTagValue(event, 'screenshotsUrls') !== null &&
    getTagValue(event, 'tags') !== null &&
    getTagValue(event, 'downloadUrls') !== null
  )
}

/**
 * Initializes the form state with values from existing mod data or defaults.
 *
 * @param existingModData - An optional object containing existing mod details. If provided, its values will be used to populate the form state.
 * @returns The initial state for the form, with values from existingModData if available, otherwise default values.
 */
export const initializeFormState = (
  existingModData?: ModDetails
): ModFormState => ({
  dTag: existingModData?.dTag || '',
  aTag: existingModData?.aTag || '',
  published_at: existingModData?.published_at || 0,
  rTag: existingModData?.rTag || window.location.host,
  game: existingModData?.game || '',
  title: existingModData?.title || '',
  body: existingModData?.body || '',
  featuredImageUrl: existingModData?.featuredImageUrl || '',
  summary: existingModData?.summary || '',
  nsfw: existingModData?.nsfw || false,
  repost: existingModData?.repost || false,
  originalAuthor: existingModData?.originalAuthor || undefined,
  screenshotsUrls: existingModData?.screenshotsUrls || [''],
  tags: existingModData?.tags.join(',') || '',
  lTags: existingModData?.lTags || [],
  LTags: existingModData?.LTags || [],
  downloadUrls: existingModData?.downloadUrls || [
    {
      url: '',
      hash: '',
      signatureKey: '',
      malwareScanLink: '',
      modVersion: '',
      customNote: ''
    }
  ]
})
