import { NDKContext, NDKContextType } from 'contexts/NDKContext'
import { useContext } from 'react'

export const useNDKContext = () => {
  const ndkContext = useContext(NDKContext)

  if (!ndkContext)
    throw new Error(
      'NDKContext should not be used in out component tree hierarchy'
    )

  return { ...ndkContext } as NDKContextType
}
