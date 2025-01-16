import { useState } from 'react'
import { useDidMount } from './useDidMount'
import { useNDKContext } from './useNDKContext'
import { CurationSetIdentifiers, getReportingSet } from 'utils'

export const useRepostList = () => {
  const ndkContext = useNDKContext()
  const [repostList, setRepostList] = useState<string[]>([])

  useDidMount(async () => {
    const list = await getReportingSet(
      CurationSetIdentifiers.Repost,
      ndkContext
    )
    setRepostList(list)
  })

  return repostList
}
