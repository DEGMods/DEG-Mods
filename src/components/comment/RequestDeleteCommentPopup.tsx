import { AlertPopup } from 'components/AlertPopup'
import { useDidMount } from 'hooks/useDidMount'
import { useNDKContext } from 'hooks/useNDKContext'
import { NDKEvent } from '@nostr-dev-kit/ndk'

interface RequestDeleteCommentPopupProps {
  ndkEvent: NDKEvent
  handleConfirm: (confirm: boolean) => void
  handleClose: () => void
}

export const RequestDeleteCommentPopup = ({
  ndkEvent,
  handleConfirm,
  handleClose
}: RequestDeleteCommentPopupProps) => {
  const { ndk } = useNDKContext()

  useDidMount(() => {
    const fetchProfile = async () => {
      if (!ndk) return

      try {
        const user = await ndk.getUser({ pubkey: ndkEvent.pubkey })
        if (!user) return

        const profile = await user.fetchProfile()
        if (!profile) return
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      }
    }

    fetchProfile()
  })

  return (
    <AlertPopup
      handleClose={handleClose}
      header="Request Comment Deletion"
      label="Are you sure you want to request deletion of this comment?"
      handleConfirm={handleConfirm}
      yesButtonLabel="Request Deletion"
      yesButtonColor="rgba(255, 70, 70, 0.65)"
      noButtonLabel="Cancel"
    >
      <div>
        <p className="text-muted">
          Note: This will create a deletion event (kind 5) that references your
          comment. The comment will be marked as deleted but may still be
          visible in some clients.
        </p>
      </div>
    </AlertPopup>
  )
}
