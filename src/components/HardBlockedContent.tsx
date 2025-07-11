import React from 'react'

interface HardBlockedContentProps {
  hardBlockedType?: 'post' | 'user'
}

/**
 * Component to display hard blocked content warning
 * This replaces all content when a post is hard blocked by an admin
 */
export const HardBlockedContent: React.FC<HardBlockedContentProps> = ({
  hardBlockedType
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
              border: 'solid 1px rgb(255 255 255 / 10%)',
              borderRadius: '8px',
              color: 'rgb(255 255 255 / 50%)'
            }}
          >
            <p>
              Since we can't delete this{' '}
              {hardBlockedType === 'user' ? "user's content" : 'post'}, and for
              legal request or verified author request, we've blocked this{' '}
              {hardBlockedType === 'user' ? 'user' : 'post'} from being viewed.
              Visit the settings page for further assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
