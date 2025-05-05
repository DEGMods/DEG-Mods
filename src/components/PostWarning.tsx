interface PostWarningsProps {
  type: 'user' | 'admin'
}

export const PostWarnings = ({ type }: PostWarningsProps) => (
  <div className="IBMSMSMBSSWarning">
    <p>
      {type === 'admin' ? (
        <>
          Warning: This post has been blocked/hidden by the site for one of the
          following reasons:
          <br />
          Malware, Not a Mod, Illegal, Spam, Verified Report of Unauthorized
          Repost.
          <br />
        </>
      ) : (
        <>Notice: You have blocked this post</>
      )}
    </p>
  </div>
)
