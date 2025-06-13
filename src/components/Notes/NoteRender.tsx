import { NDKKind } from '@nostr-dev-kit/ndk'
import { ProfileLink } from 'components/ProfileSection'
import { nip19 } from 'nostr-tools'
import React, { useCallback, useContext, useMemo, useState } from 'react'
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
import { CommentDepthContext } from 'contexts/CommentDepthContext'
import { Link } from 'react-router-dom'
import { appRoutes } from 'routes'
import { truncate } from 'lodash'

interface NoteRenderProps {
  content: string
  isDeleted?: boolean
}
const link =
  /(?:https?:\/\/|www\.)(?:[a-zA-Z0-9.-]+\.[a-zA-Z]+(?::\d+)?)(?:[/?#][\p{L}\p{N}\p{M}&.-/?=#\-@%+_,:!~*]*)?/u
const nostrMention =
  /(?:nostr:|@)?(?:npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/i
const nostrEntity =
  /(npub|note|nprofile|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{58,}/i
const nostrNip05Mention = /(?:nostr:|@)[^\s]{1,64}@[^\s]+\.[^\s]{2,}/i
const nip05Entity = /(?:nostr:|@)([^\s]{1,64}@[^\s]+\.[^\s]{2,})/i

export const NoteRender = ({ content, isDeleted }: NoteRenderProps) => {
  const depth = useContext(CommentDepthContext)
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
                  className="imgFeedRender"
                  src={href}
                  alt=""
                  onClick={() => openLightBoxOnSlide(href)}
                />
              )
            } else if (isValidVideoUrl(href)) {
              // Video
              return (
                <video
                  key={key}
                  className="videoFeedRender"
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
                    className="videoFeedRender"
                    title="Video embed"
                    width="560"
                    height="315"
                    src={`https://www.youtube.com/embed/${id}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                )
              }
            }
          }

          // Link
          return (
            <a key={key} target="_blank" href={href}>
              {href}
            </a>
          )
        } else if (nostrMention.test(part)) {
          const [encoded] = part.match(nostrEntity) || []

          if (!encoded) return part

          try {
            const decoded = nip19.decode(encoded)
            const baseUrl = appRoutes.feed + '/'
            switch (decoded.type) {
              case 'nprofile':
                return <ProfileLink key={key} pubkey={decoded.data.pubkey} />
              case 'npub':
                return <ProfileLink key={key} pubkey={decoded.data} />
              case 'note':
                if (depth >= 2)
                  return (
                    <Link
                      to={baseUrl + encoded}
                      className="IBMSMSMBSSCL_CADDate"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width="1em"
                        height="1em"
                        fill="currentColor"
                      >
                        <path d="M256 31.1c-141.4 0-255.1 93.09-255.1 208c0 49.59 21.38 94.1 56.97 130.7c-12.5 50.39-54.31 95.3-54.81 95.8C0 468.8-.5938 472.2 .6875 475.2c1.312 3 4.125 4.797 7.312 4.797c66.31 0 116-31.8 140.6-51.41c32.72 12.31 69.01 19.41 107.4 19.41C397.4 447.1 512 354.9 512 239.1S397.4 31.1 256 31.1zM368 266c0 8.836-7.164 16-16 16h-54V336c0 8.836-7.164 16-16 16h-52c-8.836 0-16-7.164-16-16V282H160c-8.836 0-16-7.164-16-16V214c0-8.838 7.164-16 16-16h53.1V144c0-8.838 7.164-16 16-16h52c8.836 0 16 7.162 16 16v54H352c8.836 0 16 7.162 16 16V266z"></path>
                      </svg>{' '}
                      {truncate(encoded)}
                    </Link>
                  )
                return <NoteWrapper key={key} noteEntity={encoded} />
              case 'nevent':
                if (depth >= 2)
                  return (
                    <Link
                      to={baseUrl + encoded}
                      className="IBMSMSMBSSCL_CADDate"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width="1em"
                        height="1em"
                        fill="currentColor"
                      >
                        <path d="M256 31.1c-141.4 0-255.1 93.09-255.1 208c0 49.59 21.38 94.1 56.97 130.7c-12.5 50.39-54.31 95.3-54.81 95.8C0 468.8-.5938 472.2 .6875 475.2c1.312 3 4.125 4.797 7.312 4.797c66.31 0 116-31.8 140.6-51.41c32.72 12.31 69.01 19.41 107.4 19.41C397.4 447.1 512 354.9 512 239.1S397.4 31.1 256 31.1zM368 266c0 8.836-7.164 16-16 16h-54V336c0 8.836-7.164 16-16 16h-52c-8.836 0-16-7.164-16-16V282H160c-8.836 0-16-7.164-16-16V214c0-8.838 7.164-16 16-16h53.1V144c0-8.838 7.164-16 16-16h52c8.836 0 16 7.162 16 16v54H352c8.836 0 16 7.162 16 16V266z"></path>
                      </svg>{' '}
                      {truncate(encoded)}
                    </Link>
                  )
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

    const groupedParts = []
    let imgGroup: JSX.Element[] = []

    _parts.forEach((part, index) => {
      const nextPart = _parts[index + 1]
      const isNextPartImage =
        nextPart && React.isValidElement(nextPart) && nextPart.type === 'img'
      // Skip empty spaces only if previous one is image and the next one is image
      if (
        React.isValidElement(part) &&
        part.props &&
        typeof part.props === 'object' &&
        'children' in part.props &&
        typeof part.props.children === 'string' &&
        part.props.children.trim() === '' &&
        imgGroup.length > 0 &&
        isNextPartImage
      ) {
        return
      }
      if (React.isValidElement(part) && part.type === 'img') {
        imgGroup.push(part)
      } else {
        if (imgGroup.length > 0) {
          groupedParts.push(
            <div
              key={imgGroup.join('-')}
              className="IBMSMSMBSSCL_CBImgGroup"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  imgGroup.length,
                  3
                )}, 1fr)`
              }}
            >
              {imgGroup}
            </div>
          )
          imgGroup = []
        }
        groupedParts.push(part)
      }
    })

    if (imgGroup.length > 0) {
      groupedParts.push(
        <div
          key={imgGroup.join('-')}
          className="IBMSMSMBSSCL_CBImgGroup"
          style={{
            gridTemplateColumns: `repeat(${imgGroup.length}, 1fr)`
          }}
        >
          {imgGroup}
        </div>
      )
    }

    return groupedParts
  }, [content, depth, openLightBoxOnSlide])

  return (
    <>
      {isDeleted ? (
        <div className="IBMSMSMBSSCL_CBDeleted">
          <i>This post has been deleted by its author</i>
        </div>
      ) : (
        _content
      )}
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
