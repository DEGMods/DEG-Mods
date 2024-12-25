import { kinds } from 'nostr-tools'
import { SignedEvent } from '.'

export interface LnurlResponse {
  callback: string
  metadata: string
  minSendable: number
  maxSendable: number
  commentAllowed: number
  tag: string
  nostrPubkey: string
  allowsNostr: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isLnurlResponse = (obj: any): obj is LnurlResponse =>
  'callback' in obj &&
  'metadata' in obj &&
  'minSendable' in obj &&
  'maxSendable' in obj &&
  'commentAllowed' in obj &&
  'tag' in obj &&
  'nostrPubkey' in obj &&
  'allowsNostr' in obj

export interface ZapRequest {
  kind: typeof kinds.ZapRequest
  content: string
  tags: string[][]
  pubkey: string
  created_at: number
}

export interface PaymentRequest extends SignedEvent {
  pr: string
}

export interface ZapReceipt extends SignedEvent {
  kind: typeof kinds.Zap
}
