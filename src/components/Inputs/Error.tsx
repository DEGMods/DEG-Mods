type InputErrorProps = {
  message: string
}

export const InputError = ({ message }: InputErrorProps) => {
  if (!message) return null

  return (
    <div className="errorMain">
      <div className="errorMainColor"></div>
      <p className="errorMainText">{message}</p>
    </div>
  )
}
