import { nip19 } from 'nostr-tools'
import { Link } from 'react-router-dom'
import { getBlogPageRoute } from 'routes'
import { truncate } from 'utils'

type BlogPreviewProps = nip19.AddressPointer & {
  original: string
}

export const BlogPreview = ({
  identifier,
  kind,
  pubkey,
  original
}: BlogPreviewProps) => {
  const route = getBlogPageRoute(
    nip19.naddrEncode({
      identifier,
      pubkey,
      kind
    })
  )

  return <Link to={route}>{truncate(original)}</Link>
}
