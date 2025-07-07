import { useAppSelector, useLocalStorage } from 'hooks'
import React from 'react'
import { FilterOptions, ModeratedFilter, SortBy } from 'types'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { Dropdown } from './Dropdown'
import { Option } from './Option'
import { NsfwFilterOptions } from './NsfwFilterOptions'
import TagsFilter from './TagsFilter'

type Props = {
  author?: string | undefined
  filterKey?: string | undefined
}

export const BlogsFilter = React.memo(
  ({ author, filterKey = 'filter-blog' }: Props) => {
    const userState = useAppSelector((state) => state.user)
    const [filterOptions, setFilterOptions] = useLocalStorage<FilterOptions>(
      filterKey,
      DEFAULT_FILTER_OPTIONS
    )

    return (
      <>
        {/* sort filter options */}
        <Dropdown label={filterOptions.sort}>
          {Object.values(SortBy).map((item, index) => (
            <div
              key={`sortByItem-${index}`}
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
        </Dropdown>

        {/* moderation filter options */}
        <Dropdown label={filterOptions.moderated}>
          {Object.values(ModeratedFilter).map((item) => {
            const isAdmin =
              userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

            if (item === ModeratedFilter.Unmoderated_Fully) {
              const isOwnProfile =
                author && userState.auth && userState.user?.pubkey === author

              if (!(isAdmin || isOwnProfile)) return null
            }

            if (item === ModeratedFilter.Only_Blocked && !isAdmin) {
              return null
            }

            return (
              <Option
                key={`sort-${item}`}
                onClick={() =>
                  setFilterOptions((prev) => ({
                    ...prev,
                    moderated: item
                  }))
                }
              >
                {item}
              </Option>
            )
          })}
        </Dropdown>

        {/* nsfw filter options */}
        <Dropdown label={filterOptions.nsfw}>
          <NsfwFilterOptions filterKey={filterKey} />
        </Dropdown>

        {/* source filter options */}
        <Dropdown
          label={
            filterOptions.source === window.location.host
              ? `Show From: ${filterOptions.source}`
              : 'Show All'
          }
        >
          <Option
            onClick={() =>
              setFilterOptions((prev) => ({
                ...prev,
                source: window.location.host
              }))
            }
          >
            Show From: {window.location.host}
          </Option>
          <Option
            onClick={() =>
              setFilterOptions((prev) => ({
                ...prev,
                source: 'Show All'
              }))
            }
          >
            Show All
          </Option>
        </Dropdown>

        <TagsFilter />
      </>
    )
  }
)
