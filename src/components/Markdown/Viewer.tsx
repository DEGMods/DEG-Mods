import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { createDirectives, presetDirectiveConfigs } from 'marked-directive'
import { youtubeDirective } from './YoutubeDirective'
import { useEffect, useMemo, useRef } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { ImageWithFallback } from '../ImageWithFallback'
import { extractHashFromUrl } from '../../utils/hashBlocking'

interface ViewerProps {
  markdown: string
}

export const Viewer = ({ markdown }: ViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootsRef = useRef<Root[]>([])

  const html = useMemo(() => {
    DOMPurify.addHook('beforeSanitizeAttributes', function (node) {
      if (node.nodeName && node.nodeName === 'IFRAME') {
        const src = node.attributes.getNamedItem('src')
        if (!(src && src.value.startsWith('https://www.youtube.com/embed/'))) {
          node.remove()
        }
      }
    })

    const sanitized = DOMPurify.sanitize(
      marked
        .use(createDirectives([...presetDirectiveConfigs, youtubeDirective]))
        .parse(`${markdown}`, {
          async: false
        }),
      {
        ADD_TAGS: ['iframe']
      }
    )

    return sanitized
  }, [markdown])

  // After the HTML is rendered, replace <img> tags that have a blossom hash
  // with ImageWithFallback React components for hash verification + fallback
  useEffect(() => {
    if (!containerRef.current) return

    // Cleanup previous React roots
    rootsRef.current.forEach((root) => {
      try {
        root.unmount()
      } catch {
        // Ignore cleanup errors
      }
    })
    rootsRef.current = []

    const imgs = containerRef.current.querySelectorAll('img')
    imgs.forEach((img) => {
      const src = img.getAttribute('src') || ''
      const hash = extractHashFromUrl(src)

      // Only replace images that have a blossom hash
      if (!hash) return

      const alt = img.getAttribute('alt') || ''

      // Create a wrapper div that takes the img's place
      const wrapper = document.createElement('div')
      wrapper.style.display = 'contents'
      img.parentNode?.replaceChild(wrapper, img)

      // Mount ImageWithFallback into the wrapper
      const root = createRoot(wrapper)
      root.render(
        <ImageWithFallback
          src={src}
          alt={alt}
          className="viewer-body-image"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      )
      rootsRef.current.push(root)
    })

    // Cleanup on unmount
    return () => {
      rootsRef.current.forEach((root) => {
        try {
          root.unmount()
        } catch {
          // Ignore cleanup errors
        }
      })
      rootsRef.current = []
    }
  }, [html])

  return (
    <div
      ref={containerRef}
      className="viewer"
      dangerouslySetInnerHTML={{ __html: html }}
    ></div>
  )
}
