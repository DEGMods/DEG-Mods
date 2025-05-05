import React, { Dispatch, SetStateAction } from 'react'

interface ModCardWoTProps {
  id: string
  setOverride: Dispatch<SetStateAction<string[]>>
}

export const ModCardWot = React.memo(({ id, setOverride }: ModCardWoTProps) => (
  <div key={id} className="cardModMainHidden">
    <p className="cardModMainHiddenText">
      You have blocked this post and/or user
    </p>
    <a
      className="btn btnMain IBMSMSliderContainerWrapperSliderActionbtn"
      role="button"
      onClick={() => {
        setOverride((prev) => [...prev, id])
      }}
    >
      View post
    </a>
  </div>
))
