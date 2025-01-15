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
