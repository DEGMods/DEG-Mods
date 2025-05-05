import {
  getRelayListForUser,
  NDKEvent,
  NDKKind,
  NDKRelayList,
  NDKRelayStatus
} from '@nostr-dev-kit/ndk'
import { InputField } from 'components/Inputs'
import { LoadingSpinner } from 'components/LoadingSpinner'
import { useAppSelector, useDidMount, useNDKContext } from 'hooks'
import { Event, UnsignedEvent } from 'nostr-tools'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { UserRelaysType } from 'types'
import { log, LogType, normalizeWebSocketURL, now, timeout } from 'utils'

const READ_MARKER = 'read'
const WRITE_MARKER = 'write'

export const RelaySettings = () => {
  const { ndk, publish } = useNDKContext()
  const userState = useAppSelector((state) => state.user)
  const [ndkRelayList, setNDKRelayList] = useState<NDKRelayList | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (userState.auth && userState.user?.pubkey) {
      setIsLoading(true)
      Promise.race([
        getRelayListForUser(userState.user?.pubkey as string, ndk),
        timeout(10000)
      ])
        .then((res) => {
          setNDKRelayList(res)
        })
        .catch((err) => {
          toast.error(
            `An error occurred in fetching user relay list: ${
              err.message || err
            }`
          )
          setNDKRelayList(new NDKRelayList(ndk))
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
      setNDKRelayList(null)
    }
  }, [userState, ndk])

  const handleAdd = async (relayUrl: string) => {
    if (!ndkRelayList) return

    const normalizedUrl = normalizeWebSocketURL(relayUrl)

    const rawEvent = ndkRelayList.rawEvent()

    const unsignedEvent: UnsignedEvent = {
      pubkey: rawEvent.pubkey,
      kind: NDKKind.RelayList,
      tags: [...rawEvent.tags, ['r', normalizedUrl]],
      content: rawEvent.content,
      created_at: now()
    }

    setIsPublishing(true)

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) {
      setIsPublishing(false)
      return
    }

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    // Handle cases where publishing failed or succeeded
    if (publishedOnRelays.length === 0) {
      toast.error('Failed to publish relay list event on any relay')
    } else {
      toast.success(
        `Event published successfully to the following relays\n\n${publishedOnRelays.join(
          '\n'
        )}`
      )

      const newNDKRelayList = new NDKRelayList(ndkRelayList.ndk, signedEvent)
      setNDKRelayList(newNDKRelayList)
    }

    setIsPublishing(false)
  }

  const handleRemove = async (relayUrl: string) => {
    if (!ndkRelayList) return

    const normalizedUrl = normalizeWebSocketURL(relayUrl)

    const rawEvent = ndkRelayList.rawEvent()

    const nonRelayTags = rawEvent.tags.filter(
      (tag) => tag[0] !== 'r' && tag[0] !== 'relay'
    )

    const relayTags = rawEvent.tags
      .filter((tag) => tag[0] === 'r' || tag[0] === 'relay')
      .filter((tag) => normalizeWebSocketURL(tag[1]) !== normalizedUrl)

    const unsignedEvent: UnsignedEvent = {
      pubkey: rawEvent.pubkey,
      kind: NDKKind.RelayList,
      tags: [...nonRelayTags, ...relayTags],
      content: rawEvent.content,
      created_at: now()
    }

    setIsPublishing(true)

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) {
      setIsPublishing(false)
      return
    }

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    // Handle cases where publishing failed or succeeded
    if (publishedOnRelays.length === 0) {
      toast.error('Failed to publish relay list event on any relay')
    } else {
      toast.success(
        `Event published successfully to the following relays\n\n${publishedOnRelays.join(
          '\n'
        )}`
      )

      const newNDKRelayList = new NDKRelayList(ndkRelayList.ndk, signedEvent)
      setNDKRelayList(newNDKRelayList)
    }

    setIsPublishing(false)
  }

  const changeRelayType = async (
    relayUrl: string,
    relayType: UserRelaysType
  ) => {
    if (!ndkRelayList) return

    const normalizedUrl = normalizeWebSocketURL(relayUrl)

    const rawEvent = ndkRelayList.rawEvent()

    const nonRelayTags = rawEvent.tags.filter(
      (tag) => tag[0] !== 'r' && tag[0] !== 'relay'
    )

    // all relay tags except the changing one
    const relayTags = rawEvent.tags
      .filter((tag) => tag[0] === 'r' || tag[0] === 'relay')
      .filter((tag) => normalizeWebSocketURL(tag[1]) !== normalizedUrl)

    // create a new relay tag
    const tag = ['r', normalizedUrl]

    // set the relay marker
    if (relayType !== UserRelaysType.Both) {
      tag.push(relayType === UserRelaysType.Read ? READ_MARKER : WRITE_MARKER)
    }

    const unsignedEvent: UnsignedEvent = {
      pubkey: rawEvent.pubkey,
      kind: NDKKind.RelayList,
      tags: [...nonRelayTags, ...relayTags, tag],
      content: rawEvent.content,
      created_at: now()
    }

    setIsPublishing(true)

    const signedEvent = await window.nostr
      ?.signEvent(unsignedEvent)
      .then((event) => event as Event)
      .catch((err) => {
        toast.error('Failed to sign the event!')
        log(true, LogType.Error, 'Failed to sign the event!', err)
        return null
      })

    if (!signedEvent) {
      setIsPublishing(false)
      return
    }

    const ndkEvent = new NDKEvent(ndk, signedEvent)
    const publishedOnRelays = await publish(ndkEvent)

    // Handle cases where publishing failed or succeeded
    if (publishedOnRelays.length === 0) {
      toast.error('Failed to publish relay list event on any relay')
    } else {
      toast.success(
        `Event published successfully to the following relays\n\n${publishedOnRelays.join(
          '\n'
        )}`
      )

      const newNDKRelayList = new NDKRelayList(ndkRelayList.ndk, signedEvent)
      setNDKRelayList(newNDKRelayList)
    }

    setIsPublishing(false)
  }

  if (isLoading)
    return (
      <>
        <div></div>
        <LoadingSpinner desc="Loading" />
      </>
    )

  if (!ndkRelayList)
    return <div>Could not fetch user relay list or user is not logged in </div>

  const relayMap = new Map<string, UserRelaysType>()

  ndkRelayList.readRelayUrls.forEach((relayUrl) => {
    const normalizedUrl = normalizeWebSocketURL(relayUrl)

    if (!relayMap.has(normalizedUrl)) {
      relayMap.set(normalizedUrl, UserRelaysType.Read)
    }
  })

  ndkRelayList.writeRelayUrls.forEach((relayUrl) => {
    const normalizedUrl = normalizeWebSocketURL(relayUrl)

    if (relayMap.has(normalizedUrl)) {
      relayMap.set(normalizedUrl, UserRelaysType.Both)
    } else {
      relayMap.set(normalizedUrl, UserRelaysType.Write)
    }
  })

  const relayEntries = Array.from(relayMap.entries())

  return (
    <>
      {isPublishing && <LoadingSpinner desc="Publishing relay list event" />}
      <div className="IBMSMSplitMainFullSideFWMid">
        <div className="IBMSMSplitMainFullSideSec">
          <div className="relayList">
            <div className="inputLabelWrapperMain">
              <label className="form-label labelMain">Your relays</label>
            </div>
            {relayEntries.length === 0 && (
              <>
                We recommend adding one of our relays if you're planning to
                frequently use DEG Mods, for a better experience.
              </>
            )}
            {relayEntries.map(([relayUrl, relayType]) => (
              <RelayListItem
                key={relayUrl}
                relayUrl={relayUrl}
                relayType={relayType}
                isOwnRelay
                handleAdd={handleAdd}
                handleRemove={handleRemove}
                changeRelayType={changeRelayType}
              />
            ))}
          </div>
        </div>

        <div className="IBMSMSplitMainFullSideSec">
          <InputField
            label="Add Relays"
            placeholder="wss://some-relay.com"
            type="text"
            name="relay"
            value={inputValue}
            onChange={(_, value) => setInputValue(value)}
          />

          <button
            className="btn btnMain"
            type="button"
            onClick={() => handleAdd(inputValue).then(() => setInputValue(''))}
          >
            Add
          </button>
        </div>

        <div className="IBMSMSplitMainFullSideSec">
          <div className="inputLabelWrapperMain">
            <label className="form-label labelMain">DEG Mods Relays</label>
            <p className="labelDescriptionMain">
              We recommend adding one of our relays if you're planning to
              frequently use DEG Mods, for a better experience.
            </p>
          </div>
          <div className="relayList">
            {degmodRelays.map((relayUrl) => {
              const normalizedUrl = normalizeWebSocketURL(relayUrl)
              const alreadyAdded = relayMap.has(normalizedUrl)

              return (
                <RelayListItem
                  key={relayUrl}
                  relayUrl={normalizedUrl}
                  alreadyAdded={alreadyAdded}
                  handleAdd={handleAdd}
                  handleRemove={handleRemove}
                  changeRelayType={changeRelayType}
                />
              )
            })}
          </div>
        </div>

        <div className="IBMSMSplitMainFullSideSec">
          <div className="inputLabelWrapperMain">
            <label className="form-label labelMain">Recommended Relays</label>
            <p className="labelDescriptionMain">
              Relays we recommend using as they support the same functionalities
              that our relays provide.
            </p>
          </div>
          <div className="relayList">
            {recommendRelays.map((relayUrl) => {
              const normalizedUrl = normalizeWebSocketURL(relayUrl)
              const alreadyAdded = relayMap.has(normalizedUrl)

              return (
                <RelayListItem
                  key={relayUrl}
                  relayUrl={normalizedUrl}
                  alreadyAdded={alreadyAdded}
                  handleAdd={handleAdd}
                  handleRemove={handleRemove}
                  changeRelayType={changeRelayType}
                />
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

type RelayItemProps = {
  relayUrl: string
  relayType?: UserRelaysType
  isOwnRelay?: boolean
  alreadyAdded?: boolean
  handleAdd: (relayUrl: string) => void
  handleRemove: (relayUrl: string) => void
  changeRelayType: (relayUrl: string, relayType: UserRelaysType) => void
}

const RelayListItem = ({
  relayUrl,
  relayType,
  isOwnRelay,
  alreadyAdded,
  handleAdd,
  handleRemove,
  changeRelayType
}: RelayItemProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const { ndk } = useNDKContext()

  useDidMount(() => {
    const ndkPool = ndk.pool

    ndkPool.on('relay:connect', (relay) => {
      if (relay.url === relayUrl) {
        setIsConnected(true)
      }
    })

    ndkPool.on('relay:disconnect', (relay) => {
      if (relay.url === relayUrl) {
        setIsConnected(false)
      }
    })

    const relay = ndkPool.relays.get(relayUrl)
    if (relay && relay.status >= NDKRelayStatus.CONNECTED) {
      setIsConnected(true)
    } else {
      setIsConnected(false)
    }
  })

  return (
    <div className="relayListItem">
      <div className="relayListItemSec relayListItemSecPic">
        <div
          className="relayListItemSecPicImg"
          style={{
            background: isConnected ? '#60ae60' : '#cd4d45'
          }}
        ></div>
      </div>
      <div className="relayListItemSec relayListItemSecDetails">
        <p className="relayListItemSecDetailsText">{relayUrl}</p>
        <div className="relayListItemSecDetailsExtra">
          {(relayType === UserRelaysType.Read ||
            relayType === UserRelaysType.Both) && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="-64 0 512 512"
              width="1em"
              height="1em"
              fill="currentColor"
              data-bs-toggle="tooltip"
              data-bss-tooltip
              aria-label="Read"
            >
              <path d="M0 64C0 28.65 28.65 0 64 0H224V128C224 145.7 238.3 160 256 160H384V448C384 483.3 355.3 512 320 512H64C28.65 512 0 483.3 0 448V64zM256 128V0L384 128H256z"></path>
            </svg>
          )}

          {(relayType === UserRelaysType.Write ||
            relayType === UserRelaysType.Both) && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 -32 576 576"
              width="1em"
              height="1em"
              fill="currentColor"
              data-bs-toggle="tooltip"
              data-bss-tooltip
              aria-label="Write"
            >
              <path d="M0 64C0 28.65 28.65 0 64 0H224V128C224 145.7 238.3 160 256 160H384V299.6L289.3 394.3C281.1 402.5 275.3 412.8 272.5 424.1L257.4 484.2C255.1 493.6 255.7 503.2 258.8 512H64C28.65 512 0 483.3 0 448V64zM256 128V0L384 128H256zM564.1 250.1C579.8 265.7 579.8 291 564.1 306.7L534.7 336.1L463.8 265.1L493.2 235.7C508.8 220.1 534.1 220.1 549.8 235.7L564.1 250.1zM311.9 416.1L441.1 287.8L512.1 358.7L382.9 487.9C378.8 492 373.6 494.9 368 496.3L307.9 511.4C302.4 512.7 296.7 511.1 292.7 507.2C288.7 503.2 287.1 497.4 288.5 491.1L303.5 431.8C304.9 426.2 307.8 421.1 311.9 416.1V416.1z"></path>
            </svg>
          )}
        </div>
      </div>
      <div className="relayListItemSec relayListItemSecActions">
        {isOwnRelay && (
          <div
            className="dropstart dropdownMain"
            style={{ position: 'absolute' }}
          >
            <button
              className="btn btnMain"
              aria-expanded="false"
              data-bs-toggle="dropdown"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="-192 0 512 512"
                width="1em"
                height="1em"
                fill="currentColor"
              >
                <path d="M64 360C94.93 360 120 385.1 120 416C120 446.9 94.93 472 64 472C33.07 472 8 446.9 8 416C8 385.1 33.07 360 64 360zM64 200C94.93 200 120 225.1 120 256C120 286.9 94.93 312 64 312C33.07 312 8 286.9 8 256C8 225.1 33.07 200 64 200zM64 152C33.07 152 8 126.9 8 96C8 65.07 33.07 40 64 40C94.93 40 120 65.07 120 96C120 126.9 94.93 152 64 152z"></path>
              </svg>
            </button>
            <div
              className="dropdown-menu dropdownMainMenu"
              style={{ position: 'absolute' }}
            >
              {(relayType === UserRelaysType.Read ||
                relayType === UserRelaysType.Write) && (
                <div
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() => changeRelayType(relayUrl, UserRelaysType.Both)}
                >
                  Read & Write
                </div>
              )}

              {relayType === UserRelaysType.Both && (
                <>
                  <div
                    className="dropdown-item dropdownMainMenuItem"
                    onClick={() =>
                      changeRelayType(relayUrl, UserRelaysType.Read)
                    }
                  >
                    Read Only
                  </div>
                  <div
                    className="dropdown-item dropdownMainMenuItem"
                    onClick={() =>
                      changeRelayType(relayUrl, UserRelaysType.Write)
                    }
                  >
                    Write Only
                  </div>
                </>
              )}

              {relayType === UserRelaysType.Read && (
                <div
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() =>
                    changeRelayType(relayUrl, UserRelaysType.Write)
                  }
                >
                  Write Only
                </div>
              )}

              {relayType === UserRelaysType.Write && (
                <div
                  className="dropdown-item dropdownMainMenuItem"
                  onClick={() => changeRelayType(relayUrl, UserRelaysType.Read)}
                >
                  Read Only
                </div>
              )}

              <div
                className="dropdown-item dropdownMainMenuItem"
                onClick={() => handleRemove(relayUrl)}
              >
                Remove
              </div>
            </div>
          </div>
        )}
        {!isOwnRelay && !alreadyAdded && (
          <button
            className="btn btnMain"
            type="button"
            onClick={() => handleAdd(relayUrl)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="-32 0 512 512"
              width="1em"
              height="1em"
              fill="currentColor"
            >
              <path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

const degmodRelays = ['wss://relay.degmods.com']

const recommendRelays = ['wss://relay.degmods.com']
