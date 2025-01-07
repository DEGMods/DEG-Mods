import { FileError } from 'react-dropzone'
import styles from './MediaInputError.module.scss'

type MediaInputErrorProps = {
  rootId: string
  index: number
  message: string
  errors?: readonly FileError[] | undefined
}

export const MediaInputError = ({
  rootId,
  index,
  message,
  errors
}: MediaInputErrorProps) => {
  if (!message) return null

  return (
    <div className={['accordion-item', styles['accordion-item']].join(' ')}>
      <h2 className='accordion-header' role='tab'>
        <button
          className={[
            'accordion-button collapsed',
            styles['accordion-button']
          ].join(' ')}
          type='button'
          data-bs-toggle='collapse'
          data-bs-target={`#${rootId} .item-${index}`}
          aria-expanded='false'
          aria-controls={`${rootId} .item-${index}`}
        >
          <div className='errorMain'>
            <div className='errorMainColor'></div>
            <p className='errorMainText'>{message}</p>
          </div>
        </button>
      </h2>
      {errors && (
        <div
          className={`accordion-collapse collapse item-${index}`}
          role='tabpanel'
          data-bs-parent={`#${rootId}`}
        >
          <div
            className={['accordion-body', styles['accordion-body']].join(' ')}
          >
            {errors.map((e) => {
              return typeof e === 'string' ? (
                <div className='errorMain' key={e}>
                  {e}
                </div>
              ) : (
                <div className='errorMain' key={e.code}>
                  {e.message}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
