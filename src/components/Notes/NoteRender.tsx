import { NDKKind } from '@nostr-dev-kit/ndk'
import { ProfileLink } from 'components/ProfileSection'
import { nip19 } from 'nostr-tools'
import { useMemo } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { BlogPreview } from './internal/BlogPreview'
import { ModPreview } from './internal/ModPreview'
import { NoteWrapper } from './internal/NoteWrapper'

interface NoteRenderProps {
  content: string
}
const link =
  /(?:https?:\/\/|www\.)(?:[a-zA-Z0-9.-]+\.[a-zA-Z]+(?::\d+)?)(?:[/?#][\p{L}\p{N}\p{M}&.-/?=#\-@%+_,:!~*]*)?/gu
const nostrMention =
  /(?:nostr:|@)?(?:npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/gi
const nostrEntity =
  /(npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/gi

export const NoteRender = ({ content }: NoteRenderProps) => {
  const _content = useMemo(() => {
    if (!content) return

    const parts = content.split(
      new RegExp(`(${link.source})|(${nostrMention.source})`, 'gui')
    )

    const _parts = parts.map((part, index) => {
      if (link.test(part)) {
        const [href] = part.match(link) || []
        return (
          <a key={index} href={href}>
            {href}
          </a>
        )
      } else if (nostrMention.test(part)) {
        const [encoded] = part.match(nostrEntity) || []

        if (!encoded) return part

        try {
          const decoded = nip19.decode(encoded)

          switch (decoded.type) {
            case 'nprofile':
              return <ProfileLink key={index} pubkey={decoded.data.pubkey} />
            case 'npub':
              return <ProfileLink key={index} pubkey={decoded.data} />
            case 'note':
              return <NoteWrapper key={index} noteEntity={encoded} />
            case 'nevent':
              return <NoteWrapper key={index} noteEntity={encoded} />
            case 'naddr':
              return (
                <Fragment key={index}>
                  {handleNaddr(decoded.data, part)}
                </Fragment>
              )

            default:
              return part
          }
        } catch (error) {
          return part
        }
      } else {
        return part
      }
    })
    return _parts
  }, [content])

  return _content
}

function handleNaddr(data: nip19.AddressPointer, original: string) {
  const { kind } = data

  if (kind === NDKKind.Article) {
    return <BlogPreview {...data} original={original} />
  } else if (kind === NDKKind.Classified) {
    return <ModPreview {...data} original={original} />
  } else {
    return <>{original}</>
  }
}
