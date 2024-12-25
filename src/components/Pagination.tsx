import React from 'react'

type PaginationProps = {
  page: number
  disabledNext: boolean
  handlePrev: () => void
  handleNext: () => void
}

export const Pagination = React.memo(
  ({ page, disabledNext, handlePrev, handleNext }: PaginationProps) => {
    return (
      <div className='IBMSecMain'>
        <div className='PaginationMain'>
          <div className='PaginationMainInside'>
            <button
              className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
              onClick={handlePrev}
              disabled={page === 1}
            >
              <i className='fas fa-chevron-left'></i>
            </button>
            <div className='PaginationMainInsideBoxGroup'>
              <button className='PaginationMainInsideBox PMIBActive'>
                <p>{page}</p>
              </button>
            </div>
            <button
              className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
              onClick={handleNext}
              disabled={disabledNext}
            >
              <i className='fas fa-chevron-right'></i>
            </button>
          </div>
        </div>
      </div>
    )
  }
)

type PaginationWithPageNumbersProps = {
  currentPage: number
  totalPages: number
  handlePageChange: (page: number) => void
}

export const PaginationWithPageNumbers = ({
  currentPage,
  totalPages,
  handlePageChange
}: PaginationWithPageNumbersProps) => {
  // Function to render the pagination controls with page numbers
  const renderPagination = () => {
    const pagesToShow = 5 // Number of page numbers to show around the current page
    const pageNumbers: (number | string)[] = [] // Array to store page numbers and ellipses

    // Case when the total number of pages is less than or equal to the limit
    if (totalPages <= pagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i) // Add all pages to the pagination
      }
    } else {
      // Add the first page (always visible)
      pageNumbers.push(1)

      // Calculate the range of pages to show around the current page
      const startPage = Math.max(2, currentPage - Math.floor(pagesToShow / 2))
      const endPage = Math.min(
        totalPages - 1,
        currentPage + Math.floor(pagesToShow / 2)
      )

      // Add ellipsis if there are pages between the first page and the startPage
      if (startPage > 2) pageNumbers.push('...')

      // Add the pages around the current page
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }

      // Add ellipsis if there are pages between the endPage and the last page
      if (endPage < totalPages - 1) pageNumbers.push('...')

      // Add the last page (always visible)
      pageNumbers.push(totalPages)
    }

    // Map over the array and render each page number or ellipsis
    return pageNumbers.map((page, index) => {
      if (typeof page === 'number') {
        // For actual page numbers, render clickable boxes
        return (
          <div
            key={index}
            className={`PaginationMainInsideBox ${
              currentPage === page ? 'PMIBActive' : '' // Highlight the current page
            }`}
            onClick={() => handlePageChange(page)} // Navigate to the selected page
          >
            <p>{page}</p>
          </div>
        )
      } else {
        // For ellipses, render non-clickable dots
        return (
          <p key={index} className='PaginationMainInsideBox PMIBDots'>
            ...
          </p>
        )
      }
    })
  }

  return (
    <div className='IBMSecMain'>
      <div className='PaginationMain'>
        <div className='PaginationMainInside'>
          <div
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <i className='fas fa-chevron-left'></i>
          </div>
          <div className='PaginationMainInsideBoxGroup'>
            {renderPagination()}
          </div>
          <div
            className='PaginationMainInsideBox PaginationMainInsideBoxArrows'
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <i className='fas fa-chevron-right'></i>
          </div>
        </div>
      </div>
    </div>
  )
}
