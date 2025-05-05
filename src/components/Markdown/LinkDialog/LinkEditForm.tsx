import { useForm } from 'react-hook-form'
import styles from './../Dialog.module.scss'

interface LinkFormFields {
  url: string
  title: string
}

interface LinkEditFormProps {
  url: string
  title: string
  onSubmit: (link: { url: string; title: string }) => void
  onCancel: () => void
}

export function LinkEditForm({
  url,
  title,
  onSubmit,
  onCancel
}: LinkEditFormProps) {
  const { register, handleSubmit, setValue } = useForm<LinkFormFields>({
    values: {
      url,
      title
    }
  })

  return (
    <div className="pUMCB_Zaps">
      <form
        className="pUMCB_ZapsInside"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e)
          e.stopPropagation()
          e.preventDefault()
        }}
        onReset={(e) => {
          e.stopPropagation()
          onCancel()
        }}
      >
        <div className="inputLabelWrapperMain">
          <label className="form-label labelMain" htmlFor="file">
            URL:
          </label>
          <input
            defaultValue={url}
            className="inputMain"
            size={40}
            autoFocus
            {...register('url')}
            onChange={(e) => setValue('url', e.currentTarget.value)}
            placeholder={'Paste an URL'}
          />
        </div>

        <div className="inputLabelWrapperMain">
          <label className="form-label labelMain" htmlFor="link-title">
            Title:
          </label>
          <input
            id="link-title"
            className="inputMain"
            size={40}
            {...register('title')}
          />
        </div>

        <div className={styles.formAction}>
          <button
            type="submit"
            title={'Set URL'}
            aria-label={'Set URL'}
            className="btn btnMain btnMainPopup"
          >
            Save
          </button>
          <button
            type="reset"
            title={'Cancel change'}
            aria-label={'Cancel change'}
            className="btn btnMain btnMainPopup"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
