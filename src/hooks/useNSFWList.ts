import { useState } from 'react'
import { useDidMount } from './useDidMount'
import { useNDKContext } from './useNDKContext'

export const useNSFWList = () => {
  const { getNSFWList } = useNDKContext()
  const [nsfwList, setNSFWList] = useState<string[]>([])

  useDidMount(async () => {
    getNSFWList().then((list) => {
      setNSFWList(list)
    })
  })

  return nsfwList
}
