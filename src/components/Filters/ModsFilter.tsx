import { useAppSelector, useLocalStorage, useModerationSettings } from 'hooks'
import React, { PropsWithChildren, useEffect } from 'react'
import {
  FilterOptions,
  SortBy,
  ModeratedFilter,
  WOTFilterOptions,
  RepostFilter
} from 'types'
import { DEFAULT_FILTER_OPTIONS } from 'utils'
import { Dropdown } from './Dropdown'
import { Option } from './Option'
import { NsfwFilterOptions } from './NsfwFilterOptions'
import TagsFilter from './TagsFilter'

type Props = {
  author?: string | undefined
  filterKey?: string | undefined
}

export const ModFilter = React.memo(
  ({ author, filterKey = 'filter', children }: PropsWithChildren<Props>) => {
    const userState = useAppSelector((state) => state.user)
    const { enhancedModeration, enhancedTrust } = useModerationSettings()
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

    useEffect(() => {
      if (
        !enhancedTrust &&
        (filterOptions.wot === WOTFilterOptions.None ||
          filterOptions.wot === WOTFilterOptions.Mine_Only ||
          filterOptions.wot === WOTFilterOptions.Exclude)
      ) {
        setFilterOptions((prev) => ({
          ...prev,
          wot: WOTFilterOptions.Site_And_Mine
        }))
      }
    }, [enhancedTrust, filterOptions.wot, setFilterOptions])

    useEffect(() => {
      if (
        !userState.auth &&
        (filterOptions.wot === WOTFilterOptions.Mine_Only ||
          filterOptions.wot === WOTFilterOptions.None ||
          filterOptions.wot === WOTFilterOptions.Exclude)
      ) {
        setFilterOptions((prev) => ({
          ...prev,
          wot: WOTFilterOptions.Site_And_Mine
        }))
      }
    }, [userState.auth, filterOptions.wot, setFilterOptions])

    return (
      <>
        {/* sort filter options */}
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

        {/* moderation filter options */}
        <Dropdown label={filterOptions.moderated}>
          {Object.values(ModeratedFilter).map((item, index) => {
            const isAdmin =
              userState.user?.npub === import.meta.env.VITE_REPORTING_NPUB

            if (item === ModeratedFilter.Only_Blocked && !isAdmin) {
              return null
            }

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

            return (
              <Option
                key={`moderatedFilterItem-${index}`}
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

        {/* wot filter options */}
        <Dropdown label={<>Trust: {filterOptions.wot}</>}>
          {Object.values(WOTFilterOptions).map((item, index) => {
            // when user is not logged in
            if (item === WOTFilterOptions.Site_And_Mine && !userState.auth) {
              return null
            }

            if (
              item === WOTFilterOptions.None ||
              item === WOTFilterOptions.Mine_Only
            ) {
              const isWoTNpub =
                userState.user?.npub === import.meta.env.VITE_SITE_WOT_NPUB

              const isOwnProfile =
                author && userState.auth && userState.user?.pubkey === author

              // Show enhanced trust options if user is logged in and has enhanced trust enabled or is admin/own profile
              if (
                !userState.auth ||
                !(isWoTNpub || isOwnProfile || enhancedTrust)
              )
                return null
            }

            // when logged in user not admin
            if (item === WOTFilterOptions.Exclude) {
              const isWoTNpub =
                userState.user?.npub === import.meta.env.VITE_SITE_WOT_NPUB

              const isOwnProfile =
                author && userState.auth && userState.user?.pubkey === author

              // Show enhanced trust options if user has enhanced trust enabled or is admin/own profile
              if (!(isWoTNpub || isOwnProfile)) return null
            }

            return (
              <Option
                key={`wotFilterOption-${index}`}
                onClick={() =>
                  setFilterOptions((prev) => ({
                    ...prev,
                    wot: item
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

        {/* repost filter options */}
        <Dropdown label={filterOptions.repost}>
          {Object.values(RepostFilter).map((item, index) => (
            <Option
              key={`repostFilterItem-${index}`}
              onClick={() =>
                setFilterOptions((prev) => ({
                  ...prev,
                  repost: item
                }))
              }
            >
              {item}
            </Option>
          ))}
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

        {children}
      </>
    )
  }
)
