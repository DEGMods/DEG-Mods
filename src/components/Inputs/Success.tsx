type InputSuccessProps = {
  message: string
}

export const InputSuccess = ({ message }: InputSuccessProps) => {
  if (!message) return null

  return (
    <div className="successMain">
      <div className="successMainColor"></div>
      <p className="successMainText">{message}</p>
    </div>
  )
}
