import { NDKEvent, NDKFilter, NDKKind } from '@nostr-dev-kit/ndk'
import { REACTIONS } from 'constants.ts'
import { useAppSelector, useDidMount, useNDKContext } from 'hooks'
import { Event, UnsignedEvent } from 'nostr-tools'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { UserRelaysType } from 'types'
import { abbreviateNumber, log, LogType, now, timeout } from 'utils'

type UseReactionsParams = {
  pubkey: string
  eTag: string
  aTag?: string
}

export const useReactions = (params: UseReactionsParams) => {
  const { ndk, fetchEventsFromUserRelays, publish } = useNDKContext()
  const [isReactionInProgress, setIsReactionInProgress] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [reactionEvents, setReactionEvents] = useState<NDKEvent[]>([])

  const userState = useAppSelector((state) => state.user)

  useDidMount(() => {
    const filter: NDKFilter = {
      kinds: [NDKKind.Reaction]
    }

    if (params.aTag) {
      filter['#a'] = [params.aTag]
    } else {
      filter['#e'] = [params.eTag]
    }

    // 1 minute timeout
    Promise.race([
      fetchEventsFromUserRelays(filter, params.pubkey, UserRelaysType.Read),
      timeout(60000)
    ])
      .then((events) => {
        setReactionEvents(events)
      })
      .finally(() => {
        setIsDataLoaded(true)
      })
  })

  const hasReactedPositively = useMemo(() => {
    return (
      !!userState.auth &&
      reactionEvents.some(
        (event) =>
          event.pubkey === userState.user?.pubkey &&
          (REACTIONS.positive.emojis.includes(event.content) ||
            REACTIONS.positive.shortCodes.includes(event.content))
      )
    )
  }, [reactionEvents, userState])

  const hasReactedNegatively = useMemo(() => {
    return (
      !!userState.auth &&
      reactionEvents.some(
        (event) =>
          event.pubkey === userState.user?.pubkey &&
          (REACTIONS.negative.emojis.includes(event.content) ||
            REACTIONS.negative.shortCodes.includes(event.content))
      )
    )
  }, [reactionEvents, userState])

  const getPubkey = async () => {
    let hexPubkey: string | undefined

    if (userState.auth && userState.user?.pubkey) {
      hexPubkey = userState.user.pubkey as string
    } else {
      try {
        hexPubkey = (await window.nostr?.getPublicKey()) as string
      } catch (error) {
        log(true, LogType.Error, `Could not get pubkey`, error)
      }
    }

    if (!hexPubkey) {
      toast.error('Could not get pubkey')
      return null
    }

    return hexPubkey
  }

  const handleReaction = async (isPositive?: boolean) => {
    if (!isDataLoaded || hasReactedPositively || hasReactedNegatively) return

    if (isReactionInProgress) return

    setIsReactionInProgress(true)

    try {
      const pubkey = await getPubkey()
      if (!pubkey) return

      const unsignedEvent: UnsignedEvent = {
        kind: NDKKind.Reaction,
        created_at: now(),
        content: isPositive ? '+' : '-',
        pubkey,
        tags: [
          ['e', params.eTag],
          ['p', params.pubkey]
        ]
      }

      if (params.aTag) {
        unsignedEvent.tags.push(['a', params.aTag])
      }

      const signedEvent = await window.nostr
        ?.signEvent(unsignedEvent)
        .then((event) => event as Event)
        .catch((err) => {
          toast.error('Failed to sign the reaction event!')
          log(true, LogType.Error, 'Failed to sign the event!', err)
          return null
        })

      if (!signedEvent) return

      const ndkEvent = new NDKEvent(ndk, signedEvent)

      setReactionEvents((prev) => [...prev, ndkEvent])

      const publishedOnRelays = await publish(ndkEvent)

      if (publishedOnRelays.length === 0) {
        log(
          true,
          LogType.Error,
          'Failed to publish reaction event on any relay'
        )
        return
      }
    } finally {
      setIsReactionInProgress(false)
    }
  }

  const { likesCount, disLikesCount } = useMemo(() => {
    let positiveCount = 0
    let negativeCount = 0

    reactionEvents.forEach((event) => {
      if (
        REACTIONS.positive.emojis.includes(event.content) ||
        REACTIONS.positive.shortCodes.includes(event.content)
      ) {
        positiveCount++
      } else if (
        REACTIONS.negative.emojis.includes(event.content) ||
        REACTIONS.negative.shortCodes.includes(event.content)
      ) {
        negativeCount++
      }
    })

    return {
      likesCount: abbreviateNumber(positiveCount),
      disLikesCount: abbreviateNumber(negativeCount)
    }
  }, [reactionEvents])

  return {
    isDataLoaded,
    likesCount,
    disLikesCount,
    hasReactedPositively,
    hasReactedNegatively,
    handleReaction
  }
}
