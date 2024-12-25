import { NDKUserProfile } from '@nostr-dev-kit/ndk'

export type UserProfile = NDKUserProfile | null

export enum UserRelaysType {
  Read = 'readRelayUrls',
  Write = 'writeRelayUrls',
  Both = 'bothRelayUrls'
}
