import { AlertPopupProps } from 'types'
import { AlertPopup } from './AlertPopup'
import { useLocalStorage } from 'hooks'

type NsfwAlertPopup = Omit<AlertPopupProps, 'header' | 'label'>

/**
 * Triggers when the user wants to switch the filter to see any of the NSFW options
 * (including preferences)
 *
 * Option will be remembered for the session only and will not show the popup again
 */
export const NsfwAlertPopup = ({
  handleConfirm,
  handleClose
}: NsfwAlertPopup) => {
  const [confirmNsfw, setConfirmNsfw] = useLocalStorage<boolean>(
    'confirm-nsfw',
    false
  )

  return (
    !confirmNsfw && (
      <AlertPopup
        header='Confirm'
        label='Are you above 18 years of age?'
        handleClose={() => {
          handleConfirm(false)
          handleClose()
        }}
        handleConfirm={(confirm: boolean) => {
          setConfirmNsfw(confirm)
          handleConfirm(confirm)
          handleClose()
        }}
      />
    )
  )
}
