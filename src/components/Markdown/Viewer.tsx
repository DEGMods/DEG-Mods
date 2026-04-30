import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { createDirectives, presetDirectiveConfigs } from 'marked-directive'
import { youtubeDirective } from './YoutubeDirective'
import { useMemo } from 'react'
import { rewriteBlossomUrl } from '../../utils/blossomRewrite'

interface ViewerProps {
  markdown: string
}

/**
 * Rewrite blossom hash image URLs in rendered HTML to use mirror servers.
 * This ensures images in markdown body content benefit from the same
 * blossom server failover as other images on the site.
 * Processes all img tags — rewriteBlossomUrl handles hash detection internally
 * and returns non-hash URLs unchanged.
 */
function rewriteBodyImages(html: string): string {
  return html.replace(
    /(<img\s[^>]*src=")([^"]+)(")/gi,
    (_match: string, prefix: string, url: string, suffix: string) => {
      const rewritten = rewriteBlossomUrl(url)
      return `${prefix}${rewritten}${suffix}`
    }
  )
}

export const Viewer = ({ markdown }: ViewerProps) => {
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

    // Rewrite blossom hash image URLs to use mirror servers
    return rewriteBodyImages(sanitized)
  }, [markdown])

  return (
    <div className="viewer" dangerouslySetInnerHTML={{ __html: html }}></div>
  )
}
