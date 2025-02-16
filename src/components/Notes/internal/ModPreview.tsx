import { nip19 } from 'nostr-tools'
import { Link } from 'react-router-dom'
import { getModPageRoute } from 'routes'
import { truncate } from 'utils'

type ModPreviewProps = nip19.AddressPointer & {
  original: string
}

export const ModPreview = ({
  identifier,
  kind,
  pubkey,
  original
}: ModPreviewProps) => {
  const route = getModPageRoute(
    nip19.naddrEncode({
      identifier,
      pubkey,
      kind
    })
  )

  return <Link to={route}>{truncate(original)}</Link>
}
