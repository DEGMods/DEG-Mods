interface PostWarningsProps {
  type: 'user' | 'admin'
  isHardBlocked?: boolean
  hardBlockedType?: 'post' | 'user'
}

export const PostWarnings = ({
  type,
  isHardBlocked = false,
  hardBlockedType
}: PostWarningsProps) => (
  <div className="IBMSMSMBSSWarning">
    <p>
      {type === 'admin' ? (
        <>
          {isHardBlocked ? (
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
