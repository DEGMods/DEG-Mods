import { nip19 } from 'nostr-tools'
import { appRoutes, getProfilePageRoute } from 'routes'
import { npubToHex } from 'utils'
import { ProfileLink } from './ProfileLink'

interface OriginalAuthorProps {
  value: string
  fallback?: boolean
}

export const OriginalAuthor = ({
  value,
  fallback = false
}: OriginalAuthorProps) => {
  let profilePubkey
  let displayName = '[name not set up]'

  // Try to decode/encode depending on what we send to link
  let profileRoute = appRoutes.home
  try {
    if (value.startsWith('nprofile1')) {
      const decoded = nip19.decode(value as `nprofile1${string}`)
      profileRoute = getProfilePageRoute(value)
      profilePubkey = decoded?.data.pubkey
    } else if (value.startsWith('npub1')) {
      profilePubkey = npubToHex(value)
      const nprofile = profilePubkey
        ? nip19.nprofileEncode({
            pubkey: profilePubkey
          })
        : undefined

      if (nprofile) {
        profileRoute = getProfilePageRoute(nprofile)
      }
    } else {
      displayName = value
    }
  } catch (error) {
    console.error('Failed to create profile link:', error)
    displayName = value
  }

  if (profileRoute && profilePubkey)
    return <ProfileLink pubkey={profilePubkey} profileRoute={profileRoute} />

  return fallback ? displayName : null
}
