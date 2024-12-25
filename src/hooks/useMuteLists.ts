import { useEffect, useState } from 'react'
import { MuteLists } from 'types'
import { useAppSelector } from './redux'
import { useNDKContext } from './useNDKContext'

export const useMuteLists = () => {
  const { getMuteLists } = useNDKContext()
  const [muteLists, setMuteLists] = useState<{
    admin: MuteLists
    user: MuteLists
  }>({
    admin: {
      authors: [],
      replaceableEvents: []
    },
    user: {
      authors: [],
      replaceableEvents: []
    }
  })

  const userState = useAppSelector((state) => state.user)

  useEffect(() => {
    const pubkey = userState.user?.pubkey as string | undefined
    getMuteLists(pubkey).then((lists) => {
      setMuteLists(lists)
    })
  }, [userState, getMuteLists])

  return muteLists
}
