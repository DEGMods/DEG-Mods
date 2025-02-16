import { NoteRender } from 'components/Notes/NoteRender'
import { useTextLimit } from 'hooks'

interface CommentContentProps {
  content: string
}

export const CommentContent = ({ content }: CommentContentProps) => {
  const { text, isTextOverflowing, isExpanded, toggle } = useTextLimit(content)

  return (
    <>
      {isExpanded && (
        <div
          className='IBMSMSMBSSCL_CBExpand IBMSMSMBSSCL_CBExpandAlt'
          onClick={toggle}
        >
          <p>Hide full post</p>
        </div>
      )}
      <p className='IBMSMSMBSSCL_CBText'>
        <NoteRender content={text} />
      </p>
      {isTextOverflowing && (
        <div className='IBMSMSMBSSCL_CBExpand' onClick={toggle}>
          <p>{isExpanded ? 'Hide' : 'View'} full post</p>
        </div>
      )}
    </>
  )
}
