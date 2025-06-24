import { useState } from 'react'

type CommentFormProps = {
  handleSubmit: (content: string, isNSFW: boolean) => Promise<boolean>
}

export const CommentForm = ({ handleSubmit }: CommentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isNSFW, setIsNSFW] = useState(false)

  const handleComment = async () => {
    setIsSubmitting(true)
    const submitted = await handleSubmit(commentText, isNSFW)
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
      <div
        className="IBMSMSMBSSCC_Bottom"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div
          className="inputLabelWrapperMain inputLabelWrapperMainAlt"
          style={{ width: 'unset' }}
        >
          <input
            type="checkbox"
            className="CheckboxMain"
            checked={isNSFW}
            id="nsfw"
            name="nsfw"
            onChange={() => setIsNSFW((isNSFW) => !isNSFW)}
          />
          <label htmlFor="nsfw" className="form-label labelMain">
            NSFW
          </label>
        </div>
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
