import axios, { AxiosError, CanceledError, isAxiosError } from 'axios'
import { SERVER_URL_STORAGE_KEY } from '../constants'
import {
  getLocalStorageItem,
  isReachable,
  isValidUrl,
  setLocalStorageItem
} from 'utils'
import { NDKFilter } from '@nostr-dev-kit/ndk'
import { NostrEvent } from 'nostr-tools'
import { BaseError, ModeratedFilter, WOTFilterOptions } from 'types'

interface PaginatedParams {
  offset?: number
  sort?: 'asc' | 'desc'
  sortBy?: string
}

interface NostrPlusParams {
  [key: `-#${string}`]: string[]
  [key: `!#${string}`]: string[]
}

interface TagFilterParams {
  includeTags?: string[]
  excludeTags?: string[]
}

interface ModerationParams {
  pubkey?: string
  moderation?: ModeratedFilter
  wot?: WOTFilterOptions
  userMuteList?: {
    authors: string[]
    events: string[]
  }
}

type NostrParams = NDKFilter

/**
 * The request body for the paginated events endpoint.
 */
export type PaginatedRequest = NostrParams &
  NostrPlusParams &
  PaginatedParams &
  ModerationParams &
  TagFilterParams

export interface PaginationResult {
  events: NostrEvent[]
  pagination: {
    total: number
    offset: number
    limit: number
    hasMore: boolean
  }
}
const FETCH_TIMEOUT = 10000 // 10s
const HEALTH_BACKOFF_MIN = 5000 // 5s
const HEALTH_BACKOFF_MAX = 3.6e6 // 1h

enum HandledErrorType {
  'INVALID' = 'Provided URL is not valid',
  'UNREACHABLE' = 'Provided URL is not reachable',
  'NOT_ACTIVE' = 'Server is not active. Cannot fetch data.',
  'DISABLED' = 'Server URL is not set.'
}

export type ServerState =
  | 'disabled'
  | 'initializing'
  | 'active'
  | 'inactive'
  | 'retry'
  | 'retrying'

export class ServerService extends EventTarget {
  private static instance: ServerService | null = null

  static getInstance(): ServerService {
    if (!ServerService.instance) {
      ServerService.instance = new ServerService()
    }
    return ServerService.instance
  }

  private serverUrl: string | null = null
  private state: ServerState = 'disabled'
  private lastChecked: number = 0

  private fetchControllers = new Map<string, AbortController>()
  private healthController: AbortController | null = null
  private retryController: AbortController | null = null

  private constructor() {
    super()
    this.loadAndValidateServerUrl()
  }

  private async loadAndValidateServerUrl(): Promise<void> {
    if (this.state === 'initializing') {
      return
    }

    try {
      this.setState('initializing')
      const storedValue = getLocalStorageItem(
        SERVER_URL_STORAGE_KEY,
        import.meta.env.VITE_DEFAULT_SERVER || 'http://localhost:3000'
      )

      const parsedUrl = JSON.parse(storedValue)
      if (parsedUrl) {
        await this.setServerUrl(parsedUrl)
      } else {
        console.warn(
          '[DEG Mods] Failed to initialize server: Bad URL. Disabling.'
        )
        this.setState('disabled')
      }
    } catch (err) {
      if (
        err instanceof BaseError &&
        err.message === HandledErrorType.UNREACHABLE
      ) {
        console.warn(
          '[DEG Mods] Failed to initialize server:',
          err,
          'Retrying.'
        )
        this.setState('retry')
        return
      }

      console.error(
        '[DEG Mods] Failed to initialize server:',
        err,
        'Disabling.'
      )
      this.setState('disabled')
    }
  }

  public getState() {
    return this.state
  }

  private setState(newState: ServerState): void {
    if (this.state === newState) {
      return
    }

    // Abort the retry loop if transitioning out of 'retrying'
    if (
      this.state === 'retrying' &&
      ['active', 'disabled', 'inactive'].includes(newState)
    ) {
      this.retryController?.abort()
    }

    if (newState === 'retry') {
      if (this.state !== 'retrying') {
        this.setState('retrying')
        this.retryHealthCheck()
      }
      // Skip if already retrying
      return
    }

    this.state = newState
    const event = new CustomEvent('stateChange', { detail: this.state })
    this.dispatchEvent(event)
  }

  async setServerUrl(newUrl: string): Promise<void> {
    if (!isValidUrl(newUrl)) {
      throw new BaseError(HandledErrorType.INVALID)
    }

    const isReachableUrl = await isReachable(`${newUrl}/health`)
    if (!isReachableUrl) {
      throw new BaseError(HandledErrorType.UNREACHABLE)
    }

    this.serverUrl = newUrl
    setLocalStorageItem(SERVER_URL_STORAGE_KEY, JSON.stringify(this.serverUrl))
    await this.checkServerHealth()
  }

  /**
   * Checks the health of the server by making a request to the server's health endpoint.
   *
   * This method performs the following steps:
   * - If the `serverUrl` is not set, it marks the server as disabled and exits.
   * - Updates the server's active status based on the response.
   *
   * @returns A promise that resolves when the health check is complete.
   */
  private async checkServerHealth(): Promise<void> {
    // No URL, transition to disabled
    if (!this.serverUrl) {
      this.setState('disabled')
      return
    }

    const now = Date.now()
    if (now - this.lastChecked <= HEALTH_BACKOFF_MIN) {
      // Skip check if we did it within minimum backoff period
      return
    }

    if (this.healthController && !this.healthController.signal.aborted) {
      // Check already in progress and not aborted by the AbortController
      return
    }

    this.healthController = new AbortController()
    const signal = this.healthController.signal

    this.lastChecked = now

    try {
      const response = await axios.get(`${this.serverUrl}/health`, {
        timeout: FETCH_TIMEOUT,
        signal
      })
      if (response.status === 200 && response.data.status === 'ok') {
        this.setState('active')
      } else {
        this.setState('retry')
      }
    } catch (error) {
      if (!(error instanceof CanceledError)) {
        console.warn('[DEG Mods] Server connection failed.')
      }
      this.setState('retry')
    } finally {
      this.healthController = null
    }
  }

  private async retryHealthCheck(): Promise<void> {
    if (this.state !== 'retrying') return

    let delay = HEALTH_BACKOFF_MIN
    let count = 0
    this.retryController = new AbortController()
    const signal = this.retryController.signal

    try {
      while (this.state === ('retrying' as ServerState)) {
        // State changed to active, abort activated, break
        if (signal.aborted) break

        await this.checkServerHealth()

        // Check server health updated state to active, break
        if (this.state === ('active' as ServerState)) break

        // Maximum time reached, break
        if (delay >= HEALTH_BACKOFF_MAX) {
          console.warn(
            '[DEG Mods] Maximum retry delay reached. Exiting retries.'
          )
          break
        }

        count++
        const event = new CustomEvent('retry', { detail: count })
        this.dispatchEvent(event)

        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 3, HEALTH_BACKOFF_MAX)
        console.warn(
          `[DEG Mods] Retrying health check in ${delay / 1000} seconds...`
        )
      }
    } finally {
      // Set to inactive if we broke out of loop while still retrying
      if (this.state === ('retrying' as ServerState)) {
        this.setState('inactive')
      }
      this.retryController = null
      const event = new CustomEvent('retry', { detail: 0 })
      this.dispatchEvent(event)
    }
  }

  disable(): void {
    if (this.state === 'disabled') {
      return
    }

    setLocalStorageItem(SERVER_URL_STORAGE_KEY, JSON.stringify(''))
    this.fetchControllers.forEach((controller) => controller.abort())
    this.healthController?.abort()
    this.setState('disabled') // Transition to disabled on manual disable
  }

  async fetch(key: string, data: PaginatedRequest): Promise<PaginationResult> {
    if (this.state !== 'active') {
      throw new Error('Server is not active. Cannot fetch data.')
    }

    if (!this.serverUrl) {
      throw new Error('Server URL is not set.')
    }

    if (this.fetchControllers.has(key)) {
      this.fetchControllers.get(key)!.abort()
    }

    const controller = new AbortController()
    this.fetchControllers.set(key, controller)
    const signal = controller.signal

    try {
      const response = await axios.post<PaginationResult>(
        `${this.serverUrl}/paginated-events`,
        data,
        {
          signal,
          timeout: FETCH_TIMEOUT
        }
      )
      this.fetchControllers.delete(key)
      return response.data
    } catch (err) {
      if (isAxiosError(err) && err instanceof AxiosError) {
        // Payload size error, no need to retry
        // {
        //    "error": "Bad Request",
        //    "message": "request entity too large"
        // }
        if (err.response?.data?.message === 'request entity too large') {
          this.setState('inactive')
          throw new Error('Error. Payload too large. Aborting.')
        }
      }

      if (!(err instanceof CanceledError)) {
        console.error(
          '[DEG Mods] Fetch failed. Re-establishing server connection.'
        )
        this.setState('retry')
      }

      throw new Error('Error fetching paginated data from the server')
    }
  }

  async games(
    sort: 'Most Popular' | 'Latest' = 'Most Popular',
    source: 'Show All' | string
  ): Promise<string[]> {
    if (this.state !== 'active') {
      throw new Error('Server is not active. Cannot fetch data.')
    }

    if (!this.serverUrl) {
      throw new Error('Server URL is not set.')
    }

    const key = 'top-games'

    if (this.fetchControllers.has(key)) {
      this.fetchControllers.get(key)!.abort()
    }

    const controller = new AbortController()
    this.fetchControllers.set(key, controller)
    const signal = controller.signal

    try {
      const response = await axios.get(`${this.serverUrl}/games`, {
        params: {
          sort,
          source
        },
        signal,
        timeout: FETCH_TIMEOUT
      })
      this.fetchControllers.delete(key)
      return response.data
    } catch (err) {
      if (!(err instanceof CanceledError)) {
        console.error(
          '[DEG Mods] Games fetch failed. Re-establishing server connection.'
        )
        this.setState('retry')
      }

      throw new Error('Error fetching paginated data from the server')
    }
  }

  // add /delete/:eventId
  async delete(eventId: string): Promise<void> {
    if (this.state !== 'active') {
      throw new Error('Server is not active. Cannot delete data.')
    }

    if (!this.serverUrl) {
      throw new Error('Server URL is not set.')
    }

    try {
      const response = await axios.get(`${this.serverUrl}/delete/${eventId}`, {
        timeout: FETCH_TIMEOUT
      })
      return response.data
    } catch (err) {
      if (!(err instanceof CanceledError)) {
        console.error(
          '[DEG Mods] Delete failed. Re-establishing server connection.'
        )
      }
    }
  }
}
