import { NDKKind } from '@nostr-dev-kit/ndk'
import { ProfileLink } from 'components/ProfileSection'
import { nip19 } from 'nostr-tools'
import { useCallback, useMemo, useState } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { BlogPreview } from './internal/BlogPreview'
import { ModPreview } from './internal/ModPreview'
import { NoteWrapper } from './internal/NoteWrapper'
import {
  getIdFromYoutubeLink,
  isValidAudioUrl,
  isValidImageUrl,
  isValidUrl,
  isValidVideoUrl,
  isYoutubeLink
} from 'utils'
import FsLightbox from 'fslightbox-react'
import { createPortal } from 'react-dom'

interface NoteRenderProps {
  content: string
}
const link =
  /(?:https?:\/\/|www\.)(?:[a-zA-Z0-9.-]+\.[a-zA-Z]+(?::\d+)?)(?:[/?#][\p{L}\p{N}\p{M}&.-/?=#\-@%+_,:!~*]*)?/u
const nostrMention =
  /(?:nostr:|@)?(?:npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/i
const nostrEntity =
  /(npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/i
const nostrNip05Mention = /(?:nostr:|@)[^\s]{1,64}@[^\s]+\.[^\s]{2,}/i
const nip05Entity = /(?:nostr:|@)([^\s]{1,64}@[^\s]+\.[^\s]{2,})/i

export const NoteRender = ({ content }: NoteRenderProps) => {
  const [lightBoxController, setLightBoxController] = useState({
    toggler: false,
    slide: 1
  })
  const slides = useMemo(() => {
    const sources: { url: string; type: 'image' | 'video' | 'youtube' }[] = []
    const parts = content.matchAll(new RegExp(`${link.source}`, 'gui'))
    ;[...parts]
      .filter((p) => typeof p !== 'undefined')
      .forEach((part) => {
        const [href] = part

        if (href && isValidUrl(href)) {
          if (isValidImageUrl(href)) {
            sources.push({ url: href, type: 'image' })
          } else if (isValidVideoUrl(href)) {
            sources.push({ url: href, type: 'video' })
          } else if (isYoutubeLink(href)) {
            const id = getIdFromYoutubeLink(href)
            if (id) {
              sources.push({
                url: `https://www.youtube.com/embed/${id}`,
                type: 'youtube'
              })
            }
          }
        }
      })

    return sources
  }, [content])

  const openLightBoxOnSlide = useCallback(
    (url: string) => {
      slides.length &&
        setLightBoxController((prev) => ({
          toggler: !prev.toggler,
          slide: slides.findIndex((s) => s.url === url) + 1
        }))
    },
    [slides]
  )

  const _content = useMemo(() => {
    if (!content) return

    const parts = content.split(
      new RegExp(
        `(${link.source})|(${nostrMention.source})|(${nostrNip05Mention.source})`,
        'gui'
      )
    )

    const _parts = parts
      .filter((p) => typeof p !== 'undefined')
      .map((part, index) => {
        const key = `${index}-${part}`
        if (link.test(part)) {
          const [href] = part.match(link) || []

          if (href && isValidUrl(href)) {
            if (isValidImageUrl(href)) {
              // Image
              return (
                <img
                  key={key}
                  className='imgFeedRender'
                  src={href}
                  alt=''
                  onClick={() => openLightBoxOnSlide(href)}
                />
              )
            } else if (isValidVideoUrl(href)) {
              // Video
              return (
                <video
                  key={key}
                  className='videoFeedRender'
                  src={href}
                  controls
                />
              )
            } else if (isValidAudioUrl(href)) {
              return <audio key={key} src={href} controls />
            } else if (isYoutubeLink(href)) {
              // Youtube
              const id = getIdFromYoutubeLink(href)
              if (id) {
                return (
                  <iframe
                    key={key}
                    className='videoFeedRender'
                    title='Video embed'
                    width='560'
                    height='315'
                    src={`https://www.youtube.com/embed/${id}`}
                    frameBorder='0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                    allowFullScreen
                  ></iframe>
                )
              }
            }
          }

          // Link
          return (
            <a key={key} target='_blank' href={href}>
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
                return <ProfileLink key={key} pubkey={decoded.data.pubkey} />
              case 'npub':
                return <ProfileLink key={key} pubkey={decoded.data} />
              case 'note':
                return <NoteWrapper key={key} noteEntity={encoded} />
              case 'nevent':
                return <NoteWrapper key={key} noteEntity={encoded} />
              case 'naddr':
                return (
                  <Fragment key={key}>
                    {handleNaddr(decoded.data, part)}
                  </Fragment>
                )

              default:
                return part
            }
          } catch (error) {
            return part
          }
        } else if (nostrNip05Mention.test(part)) {
          const matches = nip05Entity.exec(part) || []
          const nip05 = matches?.[1] || part
          return <ProfileLink key={key} nip05={nip05} fallback={nip05} />
        } else {
          return <Fragment key={key}>{part}</Fragment>
        }
      })
    return _parts
  }, [content, openLightBoxOnSlide])

  return (
    <>
      {_content}
      {slides.length > 0 &&
        createPortal(
          <FsLightbox
            toggler={lightBoxController.toggler}
            sources={slides.map((s) => s.url)}
            types={slides.map((s) => s.type)}
            slide={lightBoxController.slide}
          />,
          document.body
        )}
    </>
  )
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
