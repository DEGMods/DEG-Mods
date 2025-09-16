/**
 * Utility functions for validating downloaded file content
 * Handles detection of fake 404 responses and other invalid content
 */

import { getFileSha256 } from './getFileSha256'

/**
 * Interface for file validation result
 */
export interface FileValidationResult {
  isValid: boolean
  reason?: string
  detectedType?: string
  fileSize?: number
  actualHash?: string
}

/**
 * Common fake 404 image file sizes (in bytes)
 * Many servers use small, standard fake 404 images
 */
const SUSPICIOUS_SMALL_FILE_SIZES = [
  // Common small image sizes that are likely fake 404s
  1024,
  2048,
  4096,
  8192,
  16384, // Powers of 2
  1337,
  1234,
  5678,
  9999 // Common "placeholder" sizes
  // Add more as we discover them
]

/**
 * Maximum size for a file to be considered suspiciously small
 * Most legitimate mod files are larger than 50KB
 */
const SUSPICIOUS_SIZE_THRESHOLD = 50 * 1024 // 50KB

/**
 * Checks if a file appears to be a fake 404 image based on content analysis
 * @param file - The file to validate
 * @param expectedHash - The expected SHA256 hash (if available)
 * @returns Promise resolving to validation result
 */
export const validateFileContent = async (
  file: File,
  expectedHash?: string
): Promise<FileValidationResult> => {
  console.debug(
    `[FileValidation] Validating file: ${file.name}, size: ${file.size} bytes`
  )

  try {
    // Quick size check - very small files are suspicious
    if (file.size < SUSPICIOUS_SIZE_THRESHOLD) {
      console.debug(
        `[FileValidation] File is suspiciously small: ${file.size} bytes`
      )

      // Check if it's a known suspicious size
      if (SUSPICIOUS_SMALL_FILE_SIZES.includes(file.size)) {
        return {
          isValid: false,
          reason: `File size (${file.size} bytes) matches known fake 404 image patterns`,
          fileSize: file.size
        }
      }
    }

    // Read the first chunk of the file to check signatures
    const firstChunk = await readFileChunk(file, 0, 512) // Read first 512 bytes

    // Check for image signatures in what should be a mod file
    const detectedImageType = detectImageType(firstChunk)
    if (detectedImageType) {
      console.debug(
        `[FileValidation] Detected image type: ${detectedImageType}`
      )

      // If we're expecting a mod file but got an image, it's likely fake 404
      if (
        isExpectedModFile(file.name) &&
        file.size < SUSPICIOUS_SIZE_THRESHOLD
      ) {
        return {
          isValid: false,
          reason: `Expected mod file but received ${detectedImageType} image (likely fake 404)`,
          detectedType: detectedImageType,
          fileSize: file.size
        }
      }
    }

    // If we have an expected hash, calculate and compare
    if (expectedHash) {
      console.debug(`[FileValidation] Calculating hash for verification...`)
      const actualHash = await getFileSha256(file)

      if (actualHash.toLowerCase() !== expectedHash.toLowerCase()) {
        return {
          isValid: false,
          reason: 'Hash mismatch - file content does not match expected hash',
          actualHash,
          fileSize: file.size
        }
      }
    }

    // Additional content validation for known file types
    const contentValidation = await validateFileTypeContent(file, firstChunk)
    if (!contentValidation.isValid) {
      return contentValidation
    }

    console.debug(`[FileValidation] ✓ File validation passed`)
    return {
      isValid: true,
      fileSize: file.size
    }
  } catch (error) {
    console.error('[FileValidation] Error during file validation:', error)
    return {
      isValid: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileSize: file.size
    }
  }
}

/**
 * Reads a chunk of bytes from a file
 * @param file - The file to read from
 * @param start - Start position
 * @param length - Number of bytes to read
 * @returns Promise resolving to Uint8Array of file content
 */
const readFileChunk = async (
  file: File,
  start: number,
  length: number
): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const blob = file.slice(start, start + length)

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result))
      } else {
        reject(new Error('Failed to read file chunk'))
      }
    }

    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * Detects if the file content starts with an image signature
 * @param content - First bytes of the file
 * @returns Image type if detected, null otherwise
 */
const detectImageType = (content: Uint8Array): string | null => {
  // PNG signature
  if (
    content.length >= 4 &&
    content[0] === 0x89 &&
    content[1] === 0x50 &&
    content[2] === 0x4e &&
    content[3] === 0x47
  ) {
    return 'PNG'
  }

  // JPEG signature
  if (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  ) {
    return 'JPEG'
  }

  // GIF signature
  if (
    content.length >= 6 &&
    content[0] === 0x47 &&
    content[1] === 0x49 &&
    content[2] === 0x46 &&
    content[3] === 0x38 &&
    (content[4] === 0x37 || content[4] === 0x39) &&
    content[5] === 0x61
  ) {
    return 'GIF'
  }

  // WebP signature (RIFF...WEBP)
  if (
    content.length >= 12 &&
    content[0] === 0x52 &&
    content[1] === 0x49 &&
    content[2] === 0x46 &&
    content[3] === 0x46 &&
    content[8] === 0x57 &&
    content[9] === 0x45 &&
    content[10] === 0x42 &&
    content[11] === 0x50
  ) {
    return 'WebP'
  }

  // BMP signature
  if (content.length >= 2 && content[0] === 0x42 && content[1] === 0x4d) {
    return 'BMP'
  }

  return null
}

/**
 * Checks if a filename suggests it should be a mod file
 * @param filename - The filename to check
 * @returns True if it appears to be a mod file
 */
const isExpectedModFile = (filename: string): boolean => {
  const modExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.msi']
  const lowerFilename = filename.toLowerCase()

  return (
    modExtensions.some((ext) => lowerFilename.endsWith(ext)) ||
    lowerFilename.includes('mod') ||
    lowerFilename.includes('patch') ||
    // Check if filename looks like a hash (64 hex chars)
    /^[a-fA-F0-9]{64}(\.[a-zA-Z0-9]+)?$/.test(filename)
  )
}

/**
 * Validates file content based on expected file type
 * @param file - The file to validate
 * @param firstChunk - First bytes of the file
 * @returns Validation result
 */
const validateFileTypeContent = async (
  file: File,
  firstChunk: Uint8Array
): Promise<FileValidationResult> => {
  const filename = file.name.toLowerCase()

  // ZIP file validation
  if (filename.endsWith('.zip')) {
    // ZIP files should start with PK (0x50, 0x4b)
    if (
      firstChunk.length >= 2 &&
      (firstChunk[0] !== 0x50 || firstChunk[1] !== 0x4b)
    ) {
      return {
        isValid: false,
        reason: 'File has .zip extension but does not have ZIP file signature',
        fileSize: file.size
      }
    }
  }

  // RAR file validation
  if (filename.endsWith('.rar')) {
    // RAR files should start with "Rar!" (0x52, 0x61, 0x72, 0x21)
    if (
      firstChunk.length >= 4 &&
      (firstChunk[0] !== 0x52 ||
        firstChunk[1] !== 0x61 ||
        firstChunk[2] !== 0x72 ||
        firstChunk[3] !== 0x21)
    ) {
      return {
        isValid: false,
        reason: 'File has .rar extension but does not have RAR file signature',
        fileSize: file.size
      }
    }
  }

  // 7z file validation
  if (filename.endsWith('.7z')) {
    // 7z files should start with "7z¼¯'" (0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)
    if (
      firstChunk.length >= 6 &&
      (firstChunk[0] !== 0x37 ||
        firstChunk[1] !== 0x7a ||
        firstChunk[2] !== 0xbc ||
        firstChunk[3] !== 0xaf ||
        firstChunk[4] !== 0x27 ||
        firstChunk[5] !== 0x1c)
    ) {
      return {
        isValid: false,
        reason: 'File has .7z extension but does not have 7z file signature',
        fileSize: file.size
      }
    }
  }

  return { isValid: true }
}

/**
 * Quick validation for servers that might return fake 404s
 * This is a lighter version that can be used during server discovery
 * @param url - URL to validate
 * @returns Promise resolving to whether the URL likely contains the correct file
 */
export const quickValidateUrl = async (url: string): Promise<boolean> => {
  try {
    console.debug(`[FileValidation] Quick validation for URL: ${url}`)

    // First, do a HEAD request to check basic response
    const headResponse = await fetch(url, { method: 'HEAD' })
    if (!headResponse.ok) {
      return false
    }

    // Check content-length header - very small files are suspicious
    const contentLength = headResponse.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size < SUSPICIOUS_SIZE_THRESHOLD) {
        console.debug(
          `[FileValidation] URL returns suspiciously small file: ${size} bytes`
        )

        // For small files, do a partial download to check content
        try {
          const partialResponse = await fetch(url, {
            headers: { Range: 'bytes=0-511' } // First 512 bytes
          })

          if (partialResponse.ok || partialResponse.status === 206) {
            const buffer = await partialResponse.arrayBuffer()
            const content = new Uint8Array(buffer)

            // Check if it looks like an image
            const imageType = detectImageType(content)
            if (imageType) {
              console.debug(
                `[FileValidation] URL returns ${imageType} image, likely fake 404`
              )
              return false
            }
          }
        } catch (error) {
          console.debug(
            '[FileValidation] Partial download failed, assuming valid'
          )
        }
      }
    }

    return true
  } catch (error) {
    console.debug('[FileValidation] Quick validation failed:', error)
    return false
  }
}
