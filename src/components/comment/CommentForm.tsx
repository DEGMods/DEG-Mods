import { useState } from 'react'

type CommentFormProps = {
  handleSubmit: (content: string) => Promise<boolean>
}

export const CommentForm = ({ handleSubmit }: CommentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')

  const handleComment = async () => {
    setIsSubmitting(true)
    const submitted = await handleSubmit(commentText)
    if (submitted) setCommentText('')
    setIsSubmitting(false)
  }

  return (
    <div className="IBMSMSMBSSCommentsCreation">
      <div className="IBMSMSMBSSCC_Top">
        <textarea
          className="IBMSMSMBSSCC_Top_Box"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
      </div>
      <div className="IBMSMSMBSSCC_Bottom">
        <button
          className="btnMain"
          onClick={handleComment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Comment'}
          <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
            <div className="IBMSMSMBSSCL_CAElementLoad"></div>
          </div>
        </button>
      </div>
    </div>
  )
}
