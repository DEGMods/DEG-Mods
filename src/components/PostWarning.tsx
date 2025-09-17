interface PostWarningsProps {
  type: 'user' | 'admin'
  isHardBlocked?: boolean
  hardBlockedType?: 'post' | 'user'
  isIllegalBlocked?: boolean
  illegalBlockedType?: 'post' | 'user'
}

export const PostWarnings = ({
  type,
  isHardBlocked = false,
  hardBlockedType,
  isIllegalBlocked = false,
  illegalBlockedType
}: PostWarningsProps) => (
  <div className="IBMSMSMBSSWarning">
    <p>
      {type === 'admin' ? (
        <>
          {isIllegalBlocked ? (
            <>
              <strong style={{ color: 'rgb(255, 70, 70)' }}>
                ILLEGAL BLOCK:
              </strong>{' '}
              This {illegalBlockedType === 'user' ? 'user' : 'post'} has been
              blocked due to illegal content or legal compliance requirements.
            </>
          ) : isHardBlocked ? (
            <>
              Warning: This {hardBlockedType === 'user' ? 'user' : 'post'} has
              been hard blocked by the site.
            </>
          ) : (
            <>
              Warning: This post has been blocked/hidden by the site for one of
              the following reasons:
              <br />
              Malware, Not a Mod, Illegal, Spam, Verified Report of Unauthorized
              Repost.
              <br />
            </>
          )}
        </>
      ) : (
        <>Notice: You have blocked this post</>
      )}
    </p>
  </div>
)
