import { toast } from 'react-toastify'
import { log, LogType } from 'utils'

export type Jsonable =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly Jsonable[]
  | { readonly [key: string]: Jsonable }
  | { toJSON(): Jsonable }

/**
 * Handle errors
 * Wraps the errors without message property and stringify to a message so we can use it later
 * @param error
 * @returns
 */
export function handleError(error: unknown): Error {
  if (error instanceof Error) return error

  // No message error, wrap it and stringify
  let stringified = 'Unable to stringify the thrown value'
  try {
    stringified = JSON.stringify(error)
  } catch (error) {
    console.error(stringified, error)
  }

  return new Error(`Stringified Error: ${stringified}`)
}

export class BaseError extends Error {
  public readonly context?: Jsonable

  constructor(
    message: string,
    options: { cause?: Error; context?: Jsonable } = {}
  ) {
    const { cause, context } = options

    super(message, { cause: cause })
    this.name = this.constructor.name
    this.context = context
    Object.setPrototypeOf(this, BaseError.prototype)
  }
}

export function errorFeedback(error: unknown) {
  if (error instanceof Error) {
    toast.error(error.message)
    log(true, LogType.Error, error)
  } else {
    toast.error('Something went wrong.')
    log(true, LogType.Error, error)
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs?: number) {
    let message = 'Time elapsed.'
    if (timeoutMs) {
      message += `\n* ${timeoutMs}ms`
    }
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, TimeoutError.prototype)
  }
}

// Queue context types for better type safety
export interface QueueContext {
  queueToken?: string | null
  position?: number
  header?: string
  rawResponse?: string
  auth?: string | null
}

export const DEGMODS_ERROR_MESSAGES = {
  UPLOAD_QUEUE_FULL: 'Server is busy. Your upload is queued.',
  UPLOAD_QUEUE_POSITION: 'Waiting in upload queue...',
  UPLOAD_QUEUE_EXPIRED: 'Upload queue expired. Please try uploading again.',
  INVALID_FILE_TYPE: 'This file type is not allowed.',
  AUTH_MISSING_SHA256: 'Upload authentication failed.',
  SERVER_OUT_OF_SPACE: 'Server storage is full.',
  FILE_TOO_LARGE: 'File is too large for this server.',
  UPLOAD_DISABLED: 'Uploads are currently disabled on this server.'
}
