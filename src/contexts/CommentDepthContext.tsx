import { createContext, PropsWithChildren, useContext } from 'react'

export const CommentDepthContext = createContext(0)

export const CommentDepthProvider = ({ children }: PropsWithChildren) => {
  const depth = useContext(CommentDepthContext)
  return (
    <CommentDepthContext.Provider value={depth + 1}>
      {children}
    </CommentDepthContext.Provider>
  )
}
