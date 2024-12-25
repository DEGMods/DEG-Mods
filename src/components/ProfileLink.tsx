import { useProfile } from 'hooks/useProfile'
import { Link } from 'react-router-dom'

interface ProfileLinkProps {
  pubkey: string
  profileRoute: string
}

export const ProfileLink = ({ pubkey, profileRoute }: ProfileLinkProps) => {
  const profile = useProfile(pubkey)
  const displayName =
    profile?.displayName || profile?.name || '[name not set up]'

  return <Link to={profileRoute}>{displayName}</Link>
}
