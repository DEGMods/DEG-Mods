import { Dots } from 'components/Spinner'
import { useLocalStorage, useNDKContext } from 'hooks'
import { useComments } from 'hooks/useComments'
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react'
import { useLoaderData } from 'react-router-dom'
import {
  Addressable,
  AuthorFilterEnum,
  BlogPageLoaderResult,
  CommentEvent,
  ModPageLoaderResult,
  CommentsSortBy,
  CommentsFilterOptions,
  ModDetails
} from 'types'
import { DEFAULT_COMMENT_FILTER_OPTIONS, handleCommentSubmit } from 'utils'
import { Filter } from './Filter'
import { CommentForm } from './CommentForm'
import { Comment } from './Comment'

type Props = {
  addressable: Addressable & Partial<ModDetails> // Support both basic Addressable and full ModDetails
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

  const [commentFilterOptions] = useLocalStorage<CommentsFilterOptions>(
    'comment-filter',
    DEFAULT_COMMENT_FILTER_OPTIONS
  )

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

  const handleDiscoveredClick = () => {
    setVisible(commentEvents)
  }
  const [visible, setVisible] = useState<CommentEvent[]>([])
  const handleSubmit = handleCommentSubmit(
    event,
    setCommentEvents,
    setVisible,
    ndk
  )
  useEffect(() => {
    if (!isLoading) {
      setVisible(commentEvents)
    }
  }, [commentEvents, isLoading])

  const comments = useMemo(() => {
    let filteredComments = visible

    // Apply author filtering
    if (commentFilterOptions.author === AuthorFilterEnum.Creator_Comments) {
      filteredComments = filteredComments.filter(
        (comment) => comment.event.pubkey === addressable.author
      )
    }

    // Apply sorting
    if (commentFilterOptions.sort === CommentsSortBy.Latest) {
      filteredComments.sort((a, b) =>
        a.event.created_at && b.event.created_at
          ? b.event.created_at - a.event.created_at
          : 0
      )
    } else if (commentFilterOptions.sort === CommentsSortBy.Oldest) {
      filteredComments.sort((a, b) =>
        a.event.created_at && b.event.created_at
          ? a.event.created_at - b.event.created_at
          : 0
      )
    }

    return filteredComments
  }, [
    visible,
    commentFilterOptions.author,
    commentFilterOptions.sort,
    addressable.author
  ])

  const discoveredCount = commentEvents.length - comments.length
  return (
    <div className="IBMSMSMBSSCommentsWrapper">
      <h4 className="IBMSMSMBSSTitle">Comments</h4>
      <div className="IBMSMSMBSSComments">
        {/* Hide comment form if aTag is missing */}
        {!!addressable.aTag && (
          <CommentForm
            handleSubmit={handleSubmit}
            modDownloadUrls={addressable.downloadUrls || []}
          />
        )}
        <div>
          <button
            type="button"
            className="btnMain"
            onClick={discoveredCount ? handleDiscoveredClick : undefined}
          >
            <span>
              {isLoading ? (
                <>
                  Discovering comments
                  <Dots />
                </>
              ) : discoveredCount ? (
                <>Load {discoveredCount} discovered comments</>
              ) : (
                <>No new comments</>
              )}
            </span>
          </button>
        </div>
        <Filter />
        <div className="IBMSMSMBSSCommentsList">
          {comments.map((comment) => (
            <Comment key={comment.event.id} comment={comment} />
          ))}
          {comments.length === 0 && (
            <div className="IBMSMListFeedNoPosts">
              <p>There are no comments to show</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
