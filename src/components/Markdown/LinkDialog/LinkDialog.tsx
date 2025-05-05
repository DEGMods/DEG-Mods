import * as Popover from '@radix-ui/react-popover'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  useCellValues,
  editorRootElementRef$,
  activeEditor$,
  iconComponentFor$,
  linkDialogState$,
  usePublisher,
  onWindowChange$,
  updateLink$,
  cancelLinkEdit$,
  switchFromPreviewToLinkEdit$,
  removeLink$
} from '@mdxeditor/editor'
import React from 'react'
import { LinkEditForm } from './LinkEditForm'
import { onClickLinkCallback$ } from './onClickCell'

import styles from './../Dialog.module.scss'

/** @internal */
export const LinkDialog = () => {
  const [
    editorRootElementRef,
    activeEditor,
    iconComponentFor,
    linkDialogState,
    onClickLinkCallback
  ] = useCellValues(
    editorRootElementRef$,
    activeEditor$,
    iconComponentFor$,
    linkDialogState$,
    onClickLinkCallback$
  )
  const publishWindowChange = usePublisher(onWindowChange$)
  const updateLink = usePublisher(updateLink$)
  const cancelLinkEdit = usePublisher(cancelLinkEdit$)
  const switchFromPreviewToLinkEdit = usePublisher(switchFromPreviewToLinkEdit$)
  const removeLink = usePublisher(removeLink$)

  React.useEffect(() => {
    const update = () => {
      activeEditor?.getEditorState().read(() => {
        publishWindowChange(true)
      })
    }

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [activeEditor, publishWindowChange])

  const [copyUrlTooltipOpen, setCopyUrlTooltipOpen] = React.useState(false)

  const theRect = linkDialogState.rectangle

  const urlIsExternal =
    linkDialogState.type === 'preview' && linkDialogState.url.startsWith('http')

  return (
    <Popover.Root open={linkDialogState.type !== 'inactive'}>
      <Popover.Anchor
        data-visible={linkDialogState.type === 'edit'}
        style={{
          position: 'fixed',
          top: `${theRect?.top ?? 0}px`,
          left: `${theRect?.left ?? 0}px`,
          width: `${theRect?.width ?? 0}px`,
          height: `${theRect?.height ?? 0}px`
        }}
      />

      <Popover.Portal container={editorRootElementRef?.current}>
        <Popover.Content
          sideOffset={5}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
          key={linkDialogState.linkNodeKey}
          className={[
            'popUpMainCard',
            ...(linkDialogState.type === 'edit' ? [styles.wrapper] : [])
          ].join(' ')}
        >
          {linkDialogState.type === 'edit' && (
            <LinkEditForm
              url={linkDialogState.url}
              title={linkDialogState.title}
              onSubmit={updateLink}
              onCancel={cancelLinkEdit.bind(null)}
            />
          )}

          {linkDialogState.type === 'preview' && (
            <>
              <div className="IBMSMSMSSS_Author_Top_AddressWrapper">
                <div className="IBMSMSMSSS_Author_Top_AddressWrapped">
                  <p className="IBMSMSMSSS_Author_Top_Address">
                    <a
                      className={styles.linkDialogPreviewAnchor}
                      href={linkDialogState.url}
                      {...(urlIsExternal
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                      onClick={(e) => {
                        if (
                          onClickLinkCallback !== null &&
                          typeof onClickLinkCallback === 'function'
                        ) {
                          e.preventDefault()
                          onClickLinkCallback(linkDialogState.url)
                        }
                      }}
                      title={
                        urlIsExternal
                          ? `Open ${linkDialogState.url} in new window`
                          : linkDialogState.url
                      }
                    >
                      <span>{linkDialogState.url}</span>
                      {urlIsExternal && iconComponentFor('open_in_new')}
                    </a>
                  </p>
                </div>
                <div className="IBMSMSMSSS_Author_Top_IconWrapper">
                  <div
                    className="IBMSMSMSSS_Author_Top_IconWrapped"
                    onClick={() => {
                      switchFromPreviewToLinkEdit()
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      width="1em"
                      height="1em"
                      fill="currentColor"
                      className="IBMSMSMSSS_Author_Top_Icon"
                    >
                      <path d="M362.7 19.32C387.7-5.678 428.3-5.678 453.3 19.32L492.7 58.75C517.7 83.74 517.7 124.3 492.7 149.3L444.3 197.7L314.3 67.72L362.7 19.32zM421.7 220.3L188.5 453.4C178.1 463.8 165.2 471.5 151.1 475.6L30.77 511C22.35 513.5 13.24 511.2 7.03 504.1C.8198 498.8-1.502 489.7 .976 481.2L36.37 360.9C40.53 346.8 48.16 333.9 58.57 323.5L291.7 90.34L421.7 220.3z"></path>
                    </svg>
                  </div>

                  <Tooltip.Provider>
                    <Tooltip.Root open={copyUrlTooltipOpen}>
                      <Tooltip.Trigger asChild>
                        <div
                          className="IBMSMSMSSS_Author_Top_IconWrapped"
                          onClick={() => {
                            void window.navigator.clipboard
                              .writeText(linkDialogState.url)
                              .then(() => {
                                setCopyUrlTooltipOpen(true)
                                setTimeout(() => {
                                  setCopyUrlTooltipOpen(false)
                                }, 1000)
                              })
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                            width="1em"
                            height="1em"
                            fill="currentColor"
                            className="IBMSMSMSSS_Author_Top_Icon"
                          >
                            <path d="M384 96L384 0h-112c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48H464c26.51 0 48-21.49 48-48V128h-95.1C398.4 128 384 113.6 384 96zM416 0v96h96L416 0zM192 352V128h-144c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h192c26.51 0 48-21.49 48-48L288 416h-32C220.7 416 192 387.3 192 352z"></path>
                          </svg>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal container={editorRootElementRef?.current}>
                        <Tooltip.Content sideOffset={5}>
                          {'Copied!'}
                          <Tooltip.Arrow />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>

                  <div
                    className="IBMSMSMSSS_Author_Top_IconWrapped"
                    onClick={() => {
                      removeLink()
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 640 512"
                      width="1em"
                      height="1em"
                      fill="currentColor"
                      className="IBMSMSMSSS_Author_Top_Icon"
                    >
                      <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c8.4-19.3 10.6-41.4 4.8-63.3c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zM373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5L373 389.9z" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
