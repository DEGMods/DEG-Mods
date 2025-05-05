import React, { Dispatch, SetStateAction } from 'react'
import { AuthorFilterEnum, SortByEnum } from 'types'

export type FilterOptions = {
  sort: SortByEnum
  author: AuthorFilterEnum
}

type FilterProps = {
  filterOptions: FilterOptions
  setFilterOptions: Dispatch<SetStateAction<FilterOptions>>
}

export const Filter = React.memo(
  ({ filterOptions, setFilterOptions }: FilterProps) => {
    return (
      <div className="FiltersMain">
        <div className="FiltersMainElement">
          <div className="dropdown dropdownMain">
            <button
              className="btn dropdown-toggle btnMain btnMainDropdown"
              aria-expanded="false"
              data-bs-toggle="dropdown"
              type="button"
            >
              {filterOptions.sort}
            </button>

            <div className="dropdown-menu dropdownMainMenu">
              {Object.values(SortByEnum).map((item) => (
                <div
                  key={`sortBy-${item}`}
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      sort: item
                    }))
                  }
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="FiltersMainElement">
          <div className="dropdown dropdownMain">
            <button
              className="btn dropdown-toggle btnMain btnMainDropdown"
              aria-expanded="false"
              data-bs-toggle="dropdown"
              type="button"
            >
              {filterOptions.author}
            </button>

            <div className="dropdown-menu dropdownMainMenu">
              {Object.values(AuthorFilterEnum).map((item) => (
                <div
                  key={`sortBy-${item}`}
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() =>
                    setFilterOptions((prev) => ({
                      ...prev,
                      author: item
                    }))
                  }
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)
