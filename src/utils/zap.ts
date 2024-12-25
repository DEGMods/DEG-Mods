import { ZapReceipt, ZapRequest } from 'types'

/**
 * Gets value of description tag.
 * @param receipt - zap receipt.
 * @returns value of description tag.
 */
export const getDescription = (receipt: ZapReceipt) => {
  return receipt.tags.filter((tag) => tag[0] === 'description')[0][1]
}

/**
 * Gets value of amount tag.
 * @param request - zap receipt.
 * @returns value of amount tag.
 */
export const getAmount = (request: ZapRequest) => {
  return request.tags.filter((tag) => tag[0] === 'amount')[0][1]
}

/**
 * Gets zap amount.
 * @param receipt - zap receipt.
 * @returns zap amount
 */
export const getZapAmount = (receipt: ZapReceipt) => {
  const description = getDescription(receipt)
  let request: ZapRequest

  try {
    request = JSON.parse(description)
  } catch (err) {
    throw 'An error occurred in parsing description tag from zapReceipt'
  }

  // Zap amount is stored in mili sats, to get the zap amount we'll divide it by 1000
  return parseInt(getAmount(request)) / 1000
}
