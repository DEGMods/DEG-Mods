import { useState, useMemo } from 'react'
import { DownloadUrl } from 'types'

export interface DownloadLink {
  url: string
  title?: string
}

type CommentFormProps = {
  handleSubmit: (
    content: string,
    isNSFW: boolean,
    downloadLinks: DownloadLink[]
  ) => Promise<boolean>
  modDownloadUrls?: DownloadUrl[]
}

export const CommentForm = ({
  handleSubmit,
  modDownloadUrls = []
}: CommentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isNSFW, setIsNSFW] = useState(false)
  const [includeModDownloads, setIncludeModDownloads] = useState(true) // Default to checked

  // Convert mod download URLs to the format expected by handleSubmit
  const modDownloadLinks = useMemo((): DownloadLink[] => {
    return modDownloadUrls.map((downloadUrl) => ({
      url: downloadUrl.url,
      title:
        downloadUrl.title ||
        `${downloadUrl.modVersion ? `v${downloadUrl.modVersion}` : 'Download'}${downloadUrl.customNote ? ` - ${downloadUrl.customNote}` : ''}`
    }))
  }, [modDownloadUrls])

  const handleComment = async () => {
    setIsSubmitting(true)
    // Pass mod download links only if the checkbox is checked
    const linksToInclude = includeModDownloads ? modDownloadLinks : []
    const submitted = await handleSubmit(commentText, isNSFW, linksToInclude)
    if (submitted) {
      setCommentText('')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="IBMSMSMBSSCommentsCreation">
      <div className="IBMSMSMBSSCC_Top">
        <textarea
          className="IBMSMSMBSSCC_Top_Box"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
      </div>

      <div
        className="IBMSMSMBSSCC_Bottom"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div
            className="inputLabelWrapperMain inputLabelWrapperMainAlt"
            style={{ width: 'unset' }}
          >
            <input
              type="checkbox"
              className="CheckboxMain"
              checked={isNSFW}
              id="nsfw"
              name="nsfw"
              onChange={() => setIsNSFW((isNSFW) => !isNSFW)}
            />
            <label htmlFor="nsfw" className="form-label labelMain">
              NSFW
            </label>
          </div>

          {/* Include mod downloads checkbox - only show if there are mod downloads */}
          {modDownloadLinks.length > 0 && (
            <div
              className="inputLabelWrapperMain inputLabelWrapperMainAlt"
              style={{ width: 'unset' }}
            >
              <input
                type="checkbox"
                className="CheckboxMain"
                checked={includeModDownloads}
                id="includeDownloads"
                name="includeDownloads"
                onChange={() => setIncludeModDownloads(!includeModDownloads)}
              />
              <label
                htmlFor="includeDownloads"
                className="form-label labelMain"
              >
                Include mod downloads
              </label>
            </div>
          )}
        </div>

        <button
          className="btnMain"
          onClick={handleComment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Comment'}
          <div className="IBMSMSMBSSCL_CAElementLoadWrapper">
            <div className="IBMSMSMBSSCL_CAElementLoad"></div>
          </div>
        </button>
      </div>
    </div>
  )
}
