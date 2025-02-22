import { NostrEvent } from '@nostr-dev-kit/ndk'

export interface NoteSubmitForm {
  content: string
  nsfw: boolean
}

export interface NoteSubmitFormErrors extends Partial<NoteSubmitForm> {}

export type NoteAction =
  | {
      intent: 'submit'
      data: NoteSubmitForm
    }
  | {
      intent: 'repost'
      note1: string
      data: NostrEvent
    }

export type NoteSubmitActionResult =
  | {
      type: 'timeout'
      action: NoteAction
    }
  | {
      type: 'validation'
      formErrors: NoteSubmitFormErrors
    }
