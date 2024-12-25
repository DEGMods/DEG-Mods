import { useState } from 'react'
import { useNDKContext } from './useNDKContext'
import { useDidMount } from './useDidMount'
import { CurationSetIdentifiers, getReportingSet } from 'utils'

export const useCuratedSet = (type: CurationSetIdentifiers) => {
  const ndkContext = useNDKContext()
  const [curatedSet, setCuratedSet] = useState<string[]>([])

  useDidMount(async () => {
    setCuratedSet(await getReportingSet(type, ndkContext))
  })

  return curatedSet
}
