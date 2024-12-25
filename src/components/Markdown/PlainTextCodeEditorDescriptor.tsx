import {
  CodeBlockEditorDescriptor,
  useCodeBlockEditorContext
} from '@mdxeditor/editor'
import { useCallback, useEffect, useRef } from 'react'

export const PlainTextCodeEditorDescriptor: CodeBlockEditorDescriptor = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  match: (_language, _meta) => true,
  priority: 0,
  Editor: ({ code, focusEmitter }) => {
    const { parentEditor, lexicalNode, setCode } = useCodeBlockEditorContext()
    const defaultValue = useRef(code)
    const codeRef = useRef<HTMLElement>(null)

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLElement>) => {
        setCode(e.currentTarget.innerHTML)
      },
      [setCode]
    )

    useEffect(() => {
      const handleFocus = () => {
        if (codeRef.current) {
          codeRef.current.focus()
        }
      }
      focusEmitter.subscribe(handleFocus)
    }, [focusEmitter])

    useEffect(() => {
      const currentRef = codeRef.current
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
          if (codeRef.current?.textContent === '') {
            parentEditor.update(() => {
              lexicalNode.selectNext()
              lexicalNode.remove()
            })
          }
        }
      }
      if (currentRef) {
        currentRef.addEventListener('keydown', handleKeyDown)
      }
      return () => {
        if (currentRef) {
          currentRef.removeEventListener('keydown', handleKeyDown)
        }
      }
    }, [lexicalNode, parentEditor])

    return (
      <pre>
        <code
          ref={codeRef}
          contentEditable={true}
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: defaultValue.current }}
        />
      </pre>
    )
  }
}
