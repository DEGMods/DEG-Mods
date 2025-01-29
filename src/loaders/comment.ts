import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk'
import { NDKContextType } from 'contexts/NDKContext'
import { LoaderFunctionArgs, redirect } from 'react-router-dom'
import { CommentsLoaderResult } from 'types/comments'
import { log, LogType } from 'utils'

export const commentsLoader =
  (ndkContext: NDKContextType) =>
  async ({ params }: LoaderFunctionArgs) => {
    const { nevent } = params

    if (!nevent) {
      log(true, LogType.Error, 'Required nevent.')
      return redirect('..')
    }

    try {
      const replyEvent = await ndkContext.ndk.fetchEvent(nevent)

      if (!replyEvent) {
        throw new Error('We are unable to find the comment on the relays')
      }

      const replies: NDKEvent[] = []
      let eTag: string | undefined = replyEvent.tagValue('e')
      while (eTag) {
        const prev = await ndkContext.ndk.fetchEvent({
          kinds: [NDKKind.Text, NDKKind.GenericReply],
          ids: [eTag]
        })
        if (prev) {
          replies.push(prev)
          eTag = prev.tagValue('e')
        } else {
          eTag = undefined
        }
      }
      const result: Partial<CommentsLoaderResult> = {
        event: replyEvent,
        parents: replies
      }
      return result
    } catch (error) {
      let message = 'An error occurred in fetching comment from relays'
      log(true, LogType.Error, message, error)
      if (error instanceof Error) {
        message = error.message
        throw new Error(message)
      }
    }

    return redirect('..')
  }
