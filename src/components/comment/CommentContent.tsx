import { useTextLimit } from 'hooks/useTextLimit'
interface CommentContentProps {
  content: string
}
export const CommentContent = ({ content }: CommentContentProps) => {
  const { text, isTextOverflowing, isExpanded, toggle } = useTextLimit(content)

  return (
    <>
      <p className='IBMSMSMBSSCL_CBText'>{text}</p>
      {isTextOverflowing && (
        <div className='IBMSMSMBSSCL_CBExpand' onClick={toggle}>
          <p>{isExpanded ? 'Hide' : 'View'} full post</p>
        </div>
      )}
    </>
  )
}
