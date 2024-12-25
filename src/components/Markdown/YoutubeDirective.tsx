import { type DirectiveConfig } from 'marked-directive'

// defines `:youtube` directive
export const youtubeDirective: DirectiveConfig = {
  level: 'block',
  marker: '::',
  renderer(token) {
    //https://www.youtube.com/embed/<VIDEO_ID>
    //::youtube{#<VIDEO_ID>}
    let vid: string = ''
    if (token.attrs && token.meta.name === 'youtube') {
      if (token.attrs.id) {
        vid = token.attrs.id as string // Get the video `id` attribute (common id style)
      } else if (token.attrs.vid) {
        vid = token.attrs.vid as string // Check for the `vid` attribute (youtube directive attribute style)
      } else {
        // Fallback for id
        // In case that video starts with the number it will not be recongizned as an id
        // We have to manually fetch it
        for (const attr in token.attrs) {
          if (
            Object.prototype.hasOwnProperty.call(token.attrs, attr) &&
            attr.startsWith('#')
          ) {
            vid = attr.replace('#', '')
          }
        }
      }
    }

    if (vid) {
      return `<iframe title="Video embed" width="560" height="315" src="https://www.youtube.com/embed/${vid}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    }

    return false
  }
}
