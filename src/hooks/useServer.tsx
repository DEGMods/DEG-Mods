import { ServerContext } from 'contexts/ServerContext'
import { useContext } from 'react'

export const useServer = () => {
  const context = useContext(ServerContext)
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider')
  }
  return context
}
