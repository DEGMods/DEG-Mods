import { useNDKContext } from 'hooks'
import { useState, useEffect } from 'react'
import { UserProfile } from 'types'

export const useProfile = (pubkey?: string) => {
  const { findMetadata } = useNDKContext()
  const [profile, setProfile] = useState<UserProfile>()

  useEffect(() => {
    if (pubkey) {
      findMetadata(pubkey).then((res) => {
        setProfile(res)
      })
    }
  }, [findMetadata, pubkey])

  return profile
}
