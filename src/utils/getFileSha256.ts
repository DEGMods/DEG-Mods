export async function getFileSha256(file: File): Promise<string> {
  // Read file as ArrayBuffer
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Unexpected result type.'))
      }
    }
    reader.readAsArrayBuffer(file)
  })

  // Hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
