import { LeafDirective } from 'mdast-util-directive'
import { usePublisher, insertDirective$, DialogButton } from '@mdxeditor/editor'

function getId(url: string) {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length == 11 ? match[7] : false
}

export const YouTubeButton = () => {
  const insertDirective = usePublisher(insertDirective$)

  return (
    <DialogButton
      tooltipTitle="Insert Youtube video"
      submitButtonTitle="Insert video"
      dialogInputPlaceholder="Paste the youtube video URL"
      buttonContent="YT"
      onSubmit={(url) => {
        const videoId = getId(url)
        if (videoId) {
          insertDirective({
            name: 'youtube',
            type: 'leafDirective',

            attributes: { id: videoId },
            children: []
          } as LeafDirective)
        } else {
          alert('Invalid YouTube URL')
        }
      }}
    />
  )
}
