import React from 'react'

interface IllegalBlockedContentProps {
  illegalBlockedType?: 'post' | 'user'
}

/**
 * Component to display illegal blocked content warning
 * This replaces all content when a post is illegal blocked by an admin
 * Unlike hard blocks, illegal blocks cannot be disabled by users
 */
export const IllegalBlockedContent: React.FC<IllegalBlockedContentProps> = ({
  illegalBlockedType
}) => {
  return (
    <div
      style={{
        position: 'sticky',
        inset: 0,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'start',
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 10px'
        }}
      >
        <div className="ContainerMain">
          <div
            style={{
              padding: '10px',
              border: 'solid 1px rgb(255 70 70 / 30%)',
              borderRadius: '8px',
              color: 'rgb(255 70 70 / 80%)',
              backgroundColor: 'rgb(255 70 70 / 5%)'
            }}
          >
            <p>
              This {illegalBlockedType === 'user' ? "user's content" : 'post'}{' '}
              has been blocked due to illegal content or legal compliance
              requirements. This content cannot be viewed and this restriction
              cannot be disabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
