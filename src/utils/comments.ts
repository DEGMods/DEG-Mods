import NDK, { NDKEvent, NDKNip07Signer } from '@nostr-dev-kit/ndk'
import { toast } from 'react-toastify'
import { CommentEvent, CommentEventStatus } from 'types'
import { log, LogType } from './utils'

export function handleCommentSubmit(
  event: NDKEvent | undefined,
  setCommentEvents: React.Dispatch<React.SetStateAction<CommentEvent[]>>,
  setVisible: React.Dispatch<React.SetStateAction<CommentEvent[]>>,
  ndk: NDK
) {
  return async (content: string): Promise<boolean> => {
    if (content === '') return false

    // NDKEvent required
    if (!event) return false

    let id: string | undefined
    try {
      const reply = event.reply()
      reply.content = content.trim()

      setCommentEvents((prev) => {
        const newCommentEvents = [
          {
            event: reply,
            status: CommentEventStatus.Publishing
          },
          ...prev
        ]
        setVisible(newCommentEvents)
        return newCommentEvents
      })

      if (!ndk.signer) {
        ndk.signer = new NDKNip07Signer()
      }
      await reply.sign(ndk.signer)
      id = reply.id
      const relaySet = await reply.publish()
      if (relaySet.size) {
        setCommentEvents((prev) => {
          const newCommentEvents = prev.map((ce) => {
            if (ce.event.id === reply.id) {
              return {
                event: ce.event,
                status: CommentEventStatus.Published
              }
            }
            return ce
          })
          setVisible(newCommentEvents)
          return newCommentEvents
        })
        // when an event is successfully published remove the status from it after 15 seconds
        setTimeout(() => {
          setCommentEvents((prev) => {
            const newCommentEvents = prev.map((ce) => {
              if (ce.event.id === reply.id) {
                delete ce.status
              }

              return ce
            })
            setVisible(newCommentEvents)
            return newCommentEvents
          })
        }, 15000)
        return true
      } else {
        log(true, LogType.Error, 'Publishing reply failed.')
        setCommentEvents((prev) => {
          const newCommentEvents = prev.map((ce) => {
            if (ce.event.id === reply.id) {
              return {
                event: ce.event,
                status: CommentEventStatus.Failed
              }
            }
            return ce
          })
          setVisible(newCommentEvents)
          return newCommentEvents
        })
        return false
      }
    } catch (error) {
      toast.error('An error occurred in publishing reply.')
      log(true, LogType.Error, 'An error occurred in publishing reply.', error)
      setCommentEvents((prev) => {
        const newCommentEvents = prev.map((ce) => {
          if (ce.event.id === id) {
            return {
              event: ce.event,
              status: CommentEventStatus.Failed
            }
          }
          return ce
        })
        setVisible(newCommentEvents)
        return newCommentEvents
      })
      return false
    }
  }
}

export const NOTE_DRAFT_CACHE_KEY = 'draft-note'
