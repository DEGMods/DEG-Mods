import { NoteRender } from 'components/Notes/NoteRender'
import { CommentDepthProvider } from 'contexts/CommentDepthContext'
import { useTextLimit } from 'hooks'

interface CommentContentProps {
  content: string
  isNsfw?: boolean
  isDeleted?: boolean
  shouldShowMedia?: boolean
}

export const CommentContent = ({
  content,
  isNsfw = false,
  isDeleted = false,
  shouldShowMedia = true
}: CommentContentProps) => {
  const { text, isTextOverflowing, isExpanded, toggle } = useTextLimit(content)

  return (
    <CommentDepthProvider>
      {isExpanded && (
        <div
          className="IBMSMSMBSSCL_CBExpand IBMSMSMBSSCL_CBExpandAlt"
          onClick={toggle}
        >
          <p>Hide full post</p>
        </div>
      )}
      <div className="IBMSMSMBSSCL_CBText">
        <NoteRender
          content={text}
          isDeleted={isDeleted}
          shouldShowMedia={shouldShowMedia}
        />
      </div>
      {isTextOverflowing && !isExpanded && (
        <div className="IBMSMSMBSSCL_CBExpand" onClick={toggle}>
          <p>View full post</p>
        </div>
      )}
      {isNsfw && (
        <div className="IBMSMSMBSSCL_CommentNSWFTag">
          <p>NSFW</p>
        </div>
      )}
    </CommentDepthProvider>
  )
}
