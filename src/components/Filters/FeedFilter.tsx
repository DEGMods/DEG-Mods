import React from 'react'
import { PropsWithChildren } from 'react'
import { Filter } from '.'
import { FilterOptions, SortBy } from 'types'
import { Dropdown } from './Dropdown'
import { Option } from './Option'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { useLocalStorage } from 'hooks'
import { NsfwFilterOptions } from './NsfwFilterOptions'

interface FeedFilterProps {
  tab: number
}
export const FeedFilter = React.memo(
  ({ tab, children }: PropsWithChildren<FeedFilterProps>) => {
    const filterKey = `filter-feed-${tab}`
    const [filterOptions, setFilterOptions] = useLocalStorage<FilterOptions>(
      filterKey,
      DEFAULT_FILTER_OPTIONS
    )

    return (
      <Filter>
        {/* sort filter options */}
        {/* show only if not posts tabs */}
        {tab !== 2 && (
          <Dropdown label={filterOptions.sort}>
            {Object.values(SortBy).map((item, index) => (
              <Option
                key={`sortByItem-${index}`}
                onClick={() =>
                  setFilterOptions((prev) => ({
                    ...prev,
                    sort: item
                  }))
                }
              >
                {item}
              </Option>
            ))}
          </Dropdown>
        )}

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

        {children}
      </Filter>
    )
  }
)
