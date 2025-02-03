import { NDKSubscriptionOptions } from '@nostr-dev-kit/ndk'
import { useNDKContext } from 'hooks'
import { useState, useEffect } from 'react'
import { UserProfile } from 'types'

export const useProfile = (pubkey?: string, opts?: NDKSubscriptionOptions) => {
  const { findMetadata } = useNDKContext()
  const [profile, setProfile] = useState<UserProfile>()

  useEffect(() => {
    if (pubkey) {
      findMetadata(pubkey, opts).then((res) => {
        setProfile(res)
      })
    }
  }, [findMetadata, pubkey, opts])

  return profile
}
