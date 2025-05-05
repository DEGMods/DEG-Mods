import { PropsWithChildren } from 'react'

interface OptionProps {
  onClick: React.MouseEventHandler<HTMLDivElement>
}

export const Option = ({
  onClick,
  children
}: PropsWithChildren<OptionProps>) => {
  return (
    <div className="dropdown-item dropdownMainMenuItem" onClick={onClick}>
      {children}
    </div>
  )
}
