import { PropsWithChildren } from 'react'

interface DropdownProps {
  label: React.ReactNode
}
export const Dropdown = ({
  label,
  children
}: PropsWithChildren<DropdownProps>) => {
  return (
    <div className="FiltersMainElement">
      <div className="dropdown dropdownMain">
        <button
          className="btn dropdown-toggle btnMain btnMainDropdown"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          type="button"
        >
          {label}
        </button>
        <div className="dropdown-menu dropdownMainMenu">{children}</div>
      </div>
    </div>
  )
}
