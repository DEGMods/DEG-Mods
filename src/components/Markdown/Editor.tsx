import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeBlockPlugin,
  CodeToggle,
  CreateLink,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  MDXEditorProps,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo
} from '@mdxeditor/editor'
import { PlainTextCodeEditorDescriptor } from './PlainTextCodeEditorDescriptor'
import { YoutubeDirectiveDescriptor } from './YoutubeDirectiveDescriptor'
import { YouTubeButton } from './YoutubeButton'
import '@mdxeditor/editor/style.css'
import '../../styles/mdxEditor.scss'
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react'
import { ImageDialog } from './ImageDialog'
import { LinkDialog } from './LinkDialog'

export interface EditorRef {
  setMarkdown: (md: string) => void
}
interface EditorProps extends MDXEditorProps {}
/**
 * The editor component is small wrapper (`forwardRef`) around {@link MDXEditor MDXEditor} that sets up the toolbars and plugins, and requires `markdown` and `onChange`.
 * To reset editor markdown it's required to pass the {@link EditorRef EditorRef}.
 *
 * Extends {@link MDXEditorProps MDXEditorProps}
 *
 * **Important**: the markdown is not a state, but an _initialState_ and is not "controlled".
 * All updates are handled with onChange and will not be reflected on markdown prop.
 * This component should never re-render if used correctly.
 * @see https://mdxeditor.dev/editor/docs/getting-started#basic-usage
 */
export const Editor = React.memo(
  forwardRef<EditorRef, EditorProps>(({ markdown, onChange, ...rest }, ref) => {
    const editorRef = useRef<MDXEditorMethods>(null)
    const setMarkdown = useCallback((md: string) => {
      editorRef.current?.setMarkdown(md)
    }, [])
    useImperativeHandle(ref, () => ({ setMarkdown }))
    const plugins = useMemo(
      () => [
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <StrikeThroughSupSubToggles />
              <Separator />
              <ListsToggle />
              <Separator />
              <BlockTypeSelect />
              <Separator />

              <CreateLink />
              <InsertImage />
              <YouTubeButton />

              <Separator />

              <InsertTable />
              <InsertThematicBreak />

              <Separator />
              <InsertCodeBlock />
            </>
          )
        }),
        headingsPlugin(),
        quotePlugin(),
        imagePlugin({
          ImageDialog: ImageDialog
        }),
        tablePlugin(),
        linkPlugin(),
        linkDialogPlugin({
          LinkDialog: LinkDialog
        }),
        listsPlugin(),
        thematicBreakPlugin(),
        directivesPlugin({
          directiveDescriptors: [YoutubeDirectiveDescriptor]
        }),
        markdownShortcutPlugin(),
        // HACK: due to a bug with shortcut interaction shortcut for code block is disabled
        // Editor freezes if you type in ```word and put a space in between ``` word
        codeBlockPlugin({
          defaultCodeBlockLanguage: '',
          codeBlockEditorDescriptors: [PlainTextCodeEditorDescriptor]
        })
      ],
      []
    )

    return (
      <MDXEditor
        ref={editorRef}
        contentEditableClassName='editor'
        className='dark-theme dark-editor'
        markdown={markdown}
        plugins={plugins}
        onChange={onChange}
        {...rest}
      />
    )
  }),
  () => true
)
