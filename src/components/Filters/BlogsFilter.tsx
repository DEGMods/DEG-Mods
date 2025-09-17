import { useAppSelector, useLocalStorage, useModerationSettings } from 'hooks'
import React, { useEffect } from 'react'
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
    const { enhancedModeration } = useModerationSettings()
    const [filterOptions, setFilterOptions] = useLocalStorage<FilterOptions>(
      filterKey,
      DEFAULT_FILTER_OPTIONS
    )

    useEffect(() => {
      const isAdmin =
        userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

      if (
        !enhancedModeration &&
        !isAdmin &&
        filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
      ) {
        setFilterOptions((prev) => ({
          ...prev,
          moderated: ModeratedFilter.Moderated
        }))
      }
    }, [
      enhancedModeration,
      filterOptions.moderated,
      setFilterOptions,
      userState.user?.npub
    ])

    useEffect(() => {
      const isAdmin =
        userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

      if (
        !userState.auth &&
        !isAdmin &&
        filterOptions.moderated === ModeratedFilter.Unmoderated_Fully
      ) {
        setFilterOptions((prev) => ({
          ...prev,
          moderated: ModeratedFilter.Moderated
        }))
      }
    }, [
      userState.auth,
      filterOptions.moderated,
      setFilterOptions,
      userState.user?.npub
    ])

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

              // Show Unmoderated_Fully if user is logged in and has enhanced moderation enabled or is admin/own profile
              if (
                !userState.auth ||
                !(isAdmin || isOwnProfile || enhancedModeration)
              )
                return null
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
