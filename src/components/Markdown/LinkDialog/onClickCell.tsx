import { Cell, ClickLinkCallback } from '@mdxeditor/editor'

export const onClickLinkCallback$ = Cell<ClickLinkCallback | null>(null)
