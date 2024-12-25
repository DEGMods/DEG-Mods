export interface SignedEvent {
  kind: number
  tags: string[][]
  content: string
  created_at: number
  pubkey: string
  id: string
  sig: string
}

export interface Addressable {
  author: string
  id: string
  aTag: string
}
