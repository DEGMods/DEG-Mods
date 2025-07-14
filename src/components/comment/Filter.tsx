import { useAppSelector, useLocalStorage, useModerationSettings } from 'hooks'
import React, { useEffect } from 'react'
import {
  AuthorFilterEnum,
  CommentsSortBy,
  WOTFilterOptions,
  NSFWFilter,
  CommentsFilterOptions,
  FilterOptions
} from 'types'
import { DEFAULT_COMMENT_FILTER_OPTIONS, DEFAULT_FILTER_OPTIONS } from 'utils'

export const Filter = React.memo(() => {
  const userState = useAppSelector((state) => state.user)
  const { enhancedTrust } = useModerationSettings()
  const [filterOptions, setFilterOptions] = useLocalStorage<FilterOptions>(
    'filter',
    DEFAULT_FILTER_OPTIONS
  )

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

  const [commentFilterOptions, setCommentFilterOptions] =
    useLocalStorage<CommentsFilterOptions>(
      'comment-filter',
      DEFAULT_COMMENT_FILTER_OPTIONS
    )
  const handleSetFilterOptions = (cfo: CommentsFilterOptions) => {
    setCommentFilterOptions(cfo)
    setFilterOptions({
      ...filterOptions,
      wot: cfo.wot,
      nsfw: cfo.nsfw,
      source: cfo.source
    })
  }

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
            {commentFilterOptions.sort}
          </button>

          <div className="dropdown-menu dropdownMainMenu">
            {Object.values(CommentsSortBy).map((item) => (
              <div
                key={`sortBy-${item}`}
                className="dropdown-item dropdownMainMenuItem"
                onClick={() =>
                  handleSetFilterOptions({
                    ...commentFilterOptions,
                    sort: item
                  })
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
            {commentFilterOptions.author}
          </button>

          <div className="dropdown-menu dropdownMainMenu">
            {Object.values(AuthorFilterEnum).map((item) => (
              <div
                key={`sortBy-${item}`}
                className="dropdown-item dropdownMainMenuItem"
                onClick={() =>
                  handleSetFilterOptions({
                    ...commentFilterOptions,
                    author: item
                  })
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
            Trust: {commentFilterOptions.wot}
          </button>

          <div className="dropdown-menu dropdownMainMenu">
            {Object.values(WOTFilterOptions).map((item) => {
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

                // Show enhanced trust options if user is logged in and has enhanced trust enabled
                if (!userState.auth || !isWoTNpub || !enhancedTrust) return null
              }

              // when logged in user not admin
              if (item === WOTFilterOptions.Exclude) {
                const isWoTNpub =
                  userState.user?.npub === import.meta.env.VITE_SITE_WOT_NPUB

                // Show enhanced trust options if user has enhanced trust enabled or is admin
                if (!isWoTNpub) return null
              }

              return (
                <div
                  key={`wot-${item}`}
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() =>
                    handleSetFilterOptions({
                      ...commentFilterOptions,
                      wot: item
                    })
                  }
                >
                  {item}
                </div>
              )
            })}
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
            {filterOptions.nsfw}
          </button>

          <div className="dropdown-menu dropdownMainMenu">
            {Object.values(NSFWFilter).map((item) => (
              <div
                key={`nsfw-${item}`}
                className="dropdown-item dropdownMainMenuItem"
                onClick={() =>
                  handleSetFilterOptions({
                    ...commentFilterOptions,
                    nsfw: item
                  })
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
            {filterOptions.source === window.location.host
              ? `Show From: ${filterOptions.source}`
              : 'Show All'}
          </button>

          <div className="dropdown-menu dropdownMainMenu">
            <div
              className="dropdown-item dropdownMainMenuItem"
              onClick={() =>
                handleSetFilterOptions({
                  ...commentFilterOptions,
                  source: window.location.host
                })
              }
            >
              Show From: {window.location.host}
            </div>
            <div
              className="dropdown-item dropdownMainMenuItem"
              onClick={() =>
                handleSetFilterOptions({
                  ...commentFilterOptions,
                  source: 'Show All'
                })
              }
            >
              Show All
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
