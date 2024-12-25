export enum LogType {
  Info = 'info',
  Error = 'error',
  Warn = 'warn'
}

/**
 * Log function to conditionally log messages to the console
 *
 * @param isOn boolean or undefined indicating if logging is enabled
 * @param type LogType indicating the type of log (info, error, warn)
 * @param args unknown[] represents the rest parameters for log messages
 */
export const log = (
  isOn: boolean | undefined, // Flag to determine if logging is enabled
  type: LogType, // Type of log (info, error, warn)
  ...args: unknown[] // Log messages to be printed
) => {
  if (!isOn) return // If logging is not enabled, return early
  console[type](...args) // Log the messages to the console with the specified log type
}

/**
 * Creates a promise that rejects with a timeout error after a specified duration.
 * @param ms The duration in milliseconds after which the promise should reject. Defaults to 60000 milliseconds (1 minute).
 * @returns A promise that rejects with an Error('Timeout') after the specified duration.
 */
export const timeout = (ms: number = 60000) => {
  return new Promise<never>((_, reject) => {
    // Set a timeout using setTimeout
    setTimeout(() => {
      // Reject the promise with an Error indicating a timeout
      reject(new Error('Timeout'))
    }, ms) // Timeout duration in milliseconds
  })
}

/**
 * Copies the given text to the clipboard.
 *
 * @param text - The text to be copied to the clipboard.
 * @returns A promise that resolves to a boolean indicating success or failure.
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Check if the Clipboard API is available
    if (navigator.clipboard) {
      // Use the Clipboard API to write the text to the clipboard
      await navigator.clipboard.writeText(text)
      return true // Successfully copied
    } else {
      // Clipboard API is not available, fall back to a manual method
      const textarea = document.createElement('textarea')
      textarea.value = text
      // Ensure the textarea is not visible to the user
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      // Attempt to copy the text to the clipboard
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      return successful
    }
  } catch (error) {
    console.error('Failed to copy text to clipboard', error)
    return false // Failed to copy
  }
}

/**
 * Formats a number with commas as thousands separators.
 *
 * @param value - The number to be formatted.
 * @returns A string representing the formatted number.
 */
export const formatNumber = (value: number): string => {
  // Use `Math.round` to ensure the number is rounded to the nearest integer.
  // `Intl.NumberFormat` creates a number format object for formatting numbers.
  // The `format` method applies the format to the rounded number.
  return new Intl.NumberFormat().format(Math.round(value))
}

/**
 * Converts a formatted number string back to a numeric value.
 *
 * This function removes any commas used as thousand separators and parses the resulting string
 * to a floating-point number. If the input is not a valid number, it returns 0.
 *
 * @param value - The formatted number string (e.g., "1,234,567.89").
 * @returns The numeric value represented by the string. Returns 0 if parsing fails.
 */
export const unformatNumber = (value: string): number => {
  // Remove commas from the input string. The regular expression `/\,/g` matches all commas.
  // Replace them with an empty string to get a plain numeric string.
  // `parseFloat` converts the resulting string to a floating-point number.
  // If `parseFloat` fails to parse the string, `|| 0` ensures that the function returns 0.
  return parseFloat(value.replace(/,/g, '')) || 0
}

/**
 * Formats a number into a more readable string with suffixes.
 *
 * @param value - The number to be formatted.
 * @returns A string representing the formatted number with suffixes.
 *          - "K" for thousands
 *          - "M" for millions
 *          - "B" for billions
 *          - The number as-is if it's less than a thousand
 */
export const abbreviateNumber = (value: number): string => {
  if (value >= 1000000000) {
    // Format as billions
    return `${(value / 1000000000).toFixed(1)}B`
  } else if (value >= 1000000) {
    // Format as millions
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    // Format as thousands
    return `${(value / 1000).toFixed(1)}K`
  } else {
    // Format as regular number
    return value.toString()
  }
}

export const handleGameImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>
) => {
  e.currentTarget.src = import.meta.env.VITE_FALLBACK_GAME_IMAGE
}

export const handleModImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>
) => {
  e.currentTarget.src = import.meta.env.VITE_FALLBACK_MOD_IMAGE
}

export const scrollIntoView = (el: HTMLElement | null) => {
  if (el) {
    setTimeout(() => {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)
  }
}

export const parseFormData = <T>(formData: FormData) => {
  const result: Partial<T> = {}

  formData.forEach(
    (value, key) => ((result as Record<string, unknown>)[key] = value as string)
  )

  return result
}

export const capitalizeEachWord = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}