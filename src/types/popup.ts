export interface PopupProps {
  handleClose: () => void
}

export interface AlertPopupProps extends PopupProps {
  header: string
  label: string
  handleConfirm: (confirm: boolean) => void
  yesButtonLabel?: string | undefined
  yesButtonColor?: string | undefined
  noButtonLabel?: string | undefined
  noButtonColor?: string | undefined
}
