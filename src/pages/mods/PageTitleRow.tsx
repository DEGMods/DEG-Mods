import { SearchInput } from 'components/SearchInput'
import React, { useRef } from 'react'
import { useNavigate, createSearchParams } from 'react-router-dom'
import { appRoutes } from 'routes'

export const PageTitleRow = React.memo(() => {
  const navigate = useNavigate()
  const searchTermRef = useRef<HTMLInputElement>(null)

  const handleSearch = () => {
    const value = searchTermRef.current?.value || '' // Access the input value from the ref
    if (value !== '') {
      const searchParams = createSearchParams({
        q: encodeURIComponent(value),
        kind: 'Mods'
      })
      navigate({ pathname: appRoutes.search, search: `?${searchParams}` })
    }
  }

  // Handle "Enter" key press inside the input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="IBMSecMain">
      <div className="SearchMainWrapper">
        <div className="IBMSMTitleMain">
          <h2 className="IBMSMTitleMainHeading">Mods</h2>
        </div>
        <SearchInput
          ref={searchTermRef}
          handleKeyDown={handleKeyDown}
          handleSearch={handleSearch}
        />
      </div>
    </div>
  )
})
