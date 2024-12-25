import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { createDirectives, presetDirectiveConfigs } from 'marked-directive'
import { youtubeDirective } from './YoutubeDirective'
import { useMemo } from 'react'

interface ViewerProps {
  markdown: string
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

    return DOMPurify.sanitize(
      marked
        .use(createDirectives([...presetDirectiveConfigs, youtubeDirective]))
        .parse(`${markdown}`, {
          async: false
        }),
      {
        ADD_TAGS: ['iframe']
      }
    )
  }, [markdown])

  return (
    <div className='viewer' dangerouslySetInnerHTML={{ __html: html }}></div>
  )
}
