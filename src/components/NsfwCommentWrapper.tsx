import { useLocalStorage, useSessionStorage } from 'hooks'
import { PropsWithChildren, useState } from 'react'
import { NsfwAlertPopup } from './NsfwAlertPopup'

interface NsfwCommentWrapperProps {
  id: string
  isNsfw: boolean
  hideNsfwActive: boolean
}
export const NsfwCommentWrapper = ({
  id,
  isNsfw,
  hideNsfwActive,
  children
}: PropsWithChildren<NsfwCommentWrapperProps>) => {
  // Have we approved show nsfw comment button
  const [viewNsfwComment, setViewNsfwComment] = useSessionStorage<boolean>(
    id,
    false
  )

  const [showNsfwPopup, setShowNsfwPopup] = useState<boolean>(false)
  const [confirmNsfw] = useLocalStorage<boolean>('confirm-nsfw', false)
  const handleConfirm = (confirm: boolean) => {
    if (confirm) {
      setShowNsfwPopup(confirm)
      setViewNsfwComment(true)
    }
  }
  const handleShowNSFW = () => {
    if (confirmNsfw) {
      setViewNsfwComment(true)
    } else {
      setShowNsfwPopup(true)
    }
  }

  // Skip NSFW wrapper
  // if comment is not marked as NSFW
  // if user clicked View NSFW button
  // if hide filter is not active
  if (!isNsfw || viewNsfwComment || !hideNsfwActive) return children

  return (
    <>
      <div className="IBMSMSMBSSCL_CommentNSFW">
        <p>This post is hidden as it&#39;s marked as NSFW</p>
        <button className="btnMain" type="button" onClick={handleShowNSFW}>
          View this NSFW post
        </button>
      </div>
      {showNsfwPopup && (
        <NsfwAlertPopup
          handleConfirm={handleConfirm}
          handleClose={() => setShowNsfwPopup(false)}
        />
      )}
    </>
  )
}
