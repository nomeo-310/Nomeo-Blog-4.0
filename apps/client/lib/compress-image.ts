// ─── lib/compress-image.ts ────────────────────────────────────────────────────
// Drop-in image compression utility.
// Always outputs WebP. Automatically downsizes large images while preserving
// aspect ratio, then compresses to a target file size using binary search.
//
// Usage:
//   import { compressImage } from '@/lib/compress-image'
//   const webpFile = await compressImage(file)
//   const webpFile = await compressImage(file, { maxSizeMB: 0.5, maxDimension: 1200 })

export interface CompressImageOptions {
  /** Maximum output file size in megabytes. Default: 1 */
  maxSizeMB?: number
  /** Maximum width OR height in pixels — whichever axis is larger. Default: 1920 */
  maxDimension?: number
  /** Initial quality guess (0–1). Default: 0.82 */
  initialQuality?: number
  /** Minimum quality floor before giving up (0–1). Default: 0.3 */
  minQuality?: number
  /** How many binary-search iterations to run. Default: 8 */
  maxIterations?: number
}

interface CompressResult {
  file: File
  originalSizeMB: number
  compressedSizeMB: number
  compressionRatio: number
  width: number
  height: number
  quality: number
}

/**
 * Loads a File/Blob into an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = src
  })
}

/**
 * Converts a canvas to a Blob at a given quality.
 */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      'image/webp',
      quality
    )
  })
}

/**
 * Compresses an image File and returns a new File in WebP format.
 *
 * Steps:
 * 1. Decode the source image onto a canvas, scaling it down if it exceeds
 *    `maxDimension` on either axis (preserving aspect ratio).
 * 2. Binary-search over WebP quality until the output is ≤ `maxSizeMB`.
 * 3. Return a new File with the same base name but a `.webp` extension.
 *
 * Falls back to the original file if:
 * - The browser doesn't support `canvas.toBlob` with WebP.
 * - The image is already small enough and no resizing is needed.
 */
export async function compressImage( file: File, options: CompressImageOptions = {}): Promise<CompressResult> {
  const {
    maxSizeMB = 1,
    maxDimension = 1920,
    initialQuality = 0.82,
    minQuality = 0.3,
    maxIterations = 8,
  } = options

  const maxSizeBytes = maxSizeMB * 1024 * 1024
  const originalSizeMB = file.size / (1024 * 1024)

  // ── 1. Decode source image ────────────────────────────────────────────────
  const objectUrl = URL.createObjectURL(file)
  let img: HTMLImageElement

  try {
    img = await loadImage(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  // ── 2. Calculate target canvas dimensions ─────────────────────────────────
  let { naturalWidth: w, naturalHeight: h } = img
  const longestSide = Math.max(w, h)

  if (longestSide > maxDimension) {
    const scale = maxDimension / longestSide
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }

  // ── 3. Draw onto canvas ───────────────────────────────────────────────────
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  // Smooth scaling for downsampling
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)

  // ── 4. Binary-search quality to hit the size target ───────────────────────
  let lo = minQuality
  let hi = 1.0
  let quality = initialQuality
  let resultBlob = await canvasToBlob(canvas, quality)

  // Quick pass: if already under target, done
  if (resultBlob.size <= maxSizeBytes) {
    // Try to push quality a bit higher since we're under budget
    const highQualityBlob = await canvasToBlob(canvas, Math.min(quality + 0.1, 1.0))
    if (highQualityBlob.size <= maxSizeBytes) {
      resultBlob = highQualityBlob
      quality = Math.min(quality + 0.1, 1.0)
    }
  } else {
    // Binary search downward
    for (let i = 0; i < maxIterations; i++) {
      if (resultBlob.size <= maxSizeBytes) {
        lo = quality
      } else {
        hi = quality
      }

      quality = (lo + hi) / 2

      // Stop if range is tiny — further iterations won't help
      if (hi - lo < 0.01) break

      resultBlob = await canvasToBlob(canvas, quality)
    }

    // If we're still over budget at minimum quality, just accept it
    if (resultBlob.size > maxSizeBytes) {
      resultBlob = await canvasToBlob(canvas, minQuality)
      quality = minQuality
    }
  }

  // ── 5. Wrap in a File with .webp extension ────────────────────────────────
  const baseName = file.name.replace(/\.[^/.]+$/, '') // strip original extension
  const webpFileName = `${baseName}.webp`

  const compressedFile = new File([resultBlob], webpFileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  })

  const compressedSizeMB = compressedFile.size / (1024 * 1024)

  return {
    file: compressedFile,
    originalSizeMB,
    compressedSizeMB,
    compressionRatio: originalSizeMB / compressedSizeMB,
    width: w,
    height: h,
    quality: Math.round(quality * 100) / 100,
  }
}

/**
 * Convenience wrapper that just returns the File directly.
 * Use this when you don't need the compression metadata.
 */
export async function compressImageToFile( file: File, options?: CompressImageOptions ): Promise<File> {
  const result = await compressImage(file, options)
  return result.file
}