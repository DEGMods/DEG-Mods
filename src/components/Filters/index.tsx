import { PropsWithChildren } from 'react'

export const Filter = ({ children }: PropsWithChildren) => {
  return (
    <div className='IBMSecMain'>
      <div className='FiltersMain'>{children}</div>
    </div>
  )
}
