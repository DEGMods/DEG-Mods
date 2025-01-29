import { Spinner } from 'components/Spinner'
import { useNDKContext } from 'hooks'
import { useComments } from 'hooks/useComments'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import {
  Addressable,
  AuthorFilterEnum,
  BlogPageLoaderResult,
  CommentEvent,
  ModPageLoaderResult,
  SortByEnum
} from 'types'
import { handleCommentSubmit } from 'utils'
import { Filter, FilterOptions } from './Filter'
import { CommentForm } from './CommentForm'
import { Comment } from './Comment'

type Props = {
  addressable: Addressable
  setCommentCount: Dispatch<SetStateAction<number>>
}

export const Comments = ({ addressable, setCommentCount }: Props) => {
  const { ndk } = useNDKContext()
  const { commentEvents, setCommentEvents } = useComments(
    addressable.author,
    addressable.aTag
  )
  const { event } = useLoaderData() as
    | ModPageLoaderResult
    | BlogPageLoaderResult
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sort: SortByEnum.Latest,
    author: AuthorFilterEnum.All_Comments
  })

  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    // Initial loading to indicate comments fetching (stop after 5 seconds)
    const t = window.setTimeout(() => setIsLoading(false), 5000)
    return () => {
      window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    setCommentCount(commentEvents.length)
  }, [commentEvents, setCommentCount])

  const handleSubmit = handleCommentSubmit(event, setCommentEvents, ndk)

  const handleDiscoveredClick = () => {
    setVisible(commentEvents)
  }
  const [visible, setVisible] = useState<CommentEvent[]>([])
  useEffect(() => {
    if (isLoading) {
      setVisible(commentEvents)
    }
  }, [commentEvents, isLoading])

  const comments = useMemo(() => {
    let filteredComments = visible
    if (filterOptions.author === AuthorFilterEnum.Creator_Comments) {
      filteredComments = filteredComments.filter(
        (comment) => comment.event.pubkey === addressable.author
      )
    }

    if (filterOptions.sort === SortByEnum.Latest) {
      filteredComments.sort((a, b) =>
        a.event.created_at && b.event.created_at
          ? b.event.created_at - a.event.created_at
          : 0
      )
    } else if (filterOptions.sort === SortByEnum.Oldest) {
      filteredComments.sort((a, b) =>
        a.event.created_at && b.event.created_at
          ? a.event.created_at - b.event.created_at
          : 0
      )
    }

    return filteredComments
  }, [visible, filterOptions.author, filterOptions.sort, addressable.author])

  const discoveredCount = commentEvents.length - visible.length
  return (
    <div className='IBMSMSMBSSCommentsWrapper'>
      <h4 className='IBMSMSMBSSTitle'>Comments</h4>
      <div className='IBMSMSMBSSComments'>
        {/* Hide comment form if aTag is missing */}
        {!!addressable.aTag && <CommentForm handleSubmit={handleSubmit} />}
        <div>
          {isLoading ? (
            <Spinner />
          ) : (
            <button
              type='button'
              className='btnMain'
              onClick={discoveredCount ? handleDiscoveredClick : undefined}
            >
              <span>Load {discoveredCount} discovered comments</span>
            </button>
          )}
        </div>
        <Filter
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
        />
        <div className='IBMSMSMBSSCommentsList'>
          {comments.map((comment) => (
            <Comment key={comment.event.id} comment={comment} />
          ))}
        </div>
      </div>
    </div>
  )
}
