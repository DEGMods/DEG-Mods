import { NoteRender } from './NoteRender'

interface NotePreviewProps {
  content: string
}

export const NotePreview = ({ content }: NotePreviewProps) => {
  return (
    <div className="feedPostsPostPreview">
      <div className="feedPostsPostPreviewNote">
        <p>
          Previewing post
          <br />
        </p>
      </div>
      <div className="IBMSMSMBSSCL_CommentBottom">
        <div className="IBMSMSMBSSCL_CBText">
          <NoteRender content={content} />
        </div>
      </div>
    </div>
  )
}
