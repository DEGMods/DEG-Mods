export interface NoteSubmitForm {
  content: string
  nsfw: boolean
}

export interface NoteSubmitFormErrors extends Partial<NoteSubmitForm> {}
