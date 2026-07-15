import { loadImage } from './removeBackground'

const SEGMENTATION_MAX_SIDE = 640
const OUTPUT_MAX_SIDE = 1280

type OpenCv = Record<string, any>
let openCvPromise: Promise<OpenCv> | undefined

/** Conservative RGB + YCbCr skin classifier used only when skin occupies a
 * meaningful ring around the center object. The center seed always wins, so a
 * skin-coloured object under the reticle is not discarded outright. */
export function isLikelySkinPixel(r: number, g: number, b: number) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  const cb = 128 - .168736 * r - .331264 * g + .5 * b
  const cr = 128 + .5 * r - .418688 * g - .081312 * b
  const rgbShape = r > 45 && g > 22 && b > 12 && max - min > 12 && r > g && r > b && Math.abs(r - g) > 7
  return rgbShape && cb >= 75 && cb <= 135 && cr >= 132 && cr <= 180
}

function hasHandAroundCenter(rgba: Uint8Array, width: number, height: number) {
  const cx = width / 2; const cy = height / 2; const shortSide = Math.min(width, height)
  const inner = shortSide * .075; const outer = shortSide * .34
  let samples = 0; let skin = 0
  for (let y = Math.max(0, Math.floor(cy - outer)); y <= Math.min(height - 1, Math.ceil(cy + outer)); y += 2) {
    for (let x = Math.max(0, Math.floor(cx - outer)); x <= Math.min(width - 1, Math.ceil(cx + outer)); x += 2) {
      const distance = Math.hypot(x - cx, y - cy)
      if (distance < inner || distance > outer) continue
      const offset = (y * width + x) * 4; samples++
      if (isLikelySkinPixel(rgba[offset], rgba[offset + 1], rgba[offset + 2])) skin++
    }
  }
  return samples > 0 && skin / samples > .16
}

async function getOpenCv(): Promise<OpenCv> {
  if (openCvPromise) return openCvPromise
  openCvPromise = import('@techstark/opencv-js').then(async ({ default: cvModule }) => {
    const module = cvModule as unknown as OpenCv | Promise<OpenCv>
    const cv = module instanceof Promise ? await module : module
    if (cv.Mat) return cv
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('물체 인식 엔진을 불러오지 못했어요.')), 20_000)
      cv.onRuntimeInitialized = () => { window.clearTimeout(timeout); resolve() }
    })
    return cv
  })
  return openCvPromise
}

/**
 * Keeps only the connected foreground component that contains the camera's
 * center reticle. This prevents another high-contrast object elsewhere in the
 * photo from being selected by GrabCut.
 */
export function selectCenterComponent(binary: Uint8Array, width: number, height: number) {
  const selected = new Uint8Array(binary.length)
  const visited = new Uint8Array(binary.length)
  const queue = new Int32Array(binary.length)
  const cx = Math.floor(width / 2); const cy = Math.floor(height / 2)
  let seed = cy * width + cx

  // The center marker is small. Find the nearest foreground pixel within 8%
  // of the frame in case anti-aliasing moved the exact center to background.
  if (!binary[seed]) {
    const radius = Math.max(3, Math.round(Math.min(width, height) * .08))
    let bestDistance = Infinity
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const index = y * width + x
        if (!binary[index]) continue
        const distance = (x - cx) ** 2 + (y - cy) ** 2
        if (distance < bestDistance) { bestDistance = distance; seed = index }
      }
    }
    if (bestDistance === Infinity) return selected
  }

  let head = 0; let tail = 0
  queue[tail++] = seed; visited[seed] = 1
  while (head < tail) {
    const index = queue[head++]; selected[index] = 255
    const x = index % width
    const neighbors = [index - width, index + width, index - 1, index + 1]
    for (const next of neighbors) {
      if (next < 0 || next >= binary.length || visited[next] || !binary[next]) continue
      if ((next === index - 1 && x === 0) || (next === index + 1 && x === width - 1)) continue
      visited[next] = 1; queue[tail++] = next
    }
  }
  return selected
}

/**
 * GrabCut with explicit semantic hints:
 * - outside border = definite background
 * - broad center ellipse = probable foreground
 * - center reticle = definite foreground
 * The result is then constrained to the component nearest the reticle.
 */
export async function removeBackgroundFromCenter(url: string, feather: number) {
  const [image, cv] = await Promise.all([loadImage(url), getOpenCv()])
  const segmentScale = Math.min(1, SEGMENTATION_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(2, Math.round(image.naturalWidth * segmentScale))
  const height = Math.max(2, Math.round(image.naturalHeight * segmentScale))
  const work = document.createElement('canvas'); work.width = width; work.height = height
  work.getContext('2d')!.drawImage(image, 0, 0, width, height)

  const source = cv.imread(work)
  const rgb = new cv.Mat()
  const mask = new cv.Mat(height, width, cv.CV_8UC1)
  try {
    cv.cvtColor(source, rgb, cv.COLOR_RGBA2RGB)
    const border = Math.max(5, Math.round(Math.min(width, height) * .035))
    const center = new cv.Point(Math.round(width / 2), Math.round(height / 2))
    const handAware = hasHandAroundCenter(source.data, width, height)
    const runPass = (radiusX: number, radiusY: number, iterations: number) => {
      mask.data.fill(cv.GC_PR_BGD)
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (x < border || x >= width - border || y < border || y >= height - border) mask.data[y * width + x] = cv.GC_BGD
      }
      // A tight probable-foreground area avoids teaching GrabCut that the table,
      // fabric or floor beneath a small object is part of that object.
      const shortSide = Math.min(width, height)
      cv.ellipse(mask, center, new cv.Size(Math.round(shortSide * radiusX), Math.round(shortSide * radiusY)), 0, 0, 360, new cv.Scalar(cv.GC_PR_FGD), -1)
      const seedRadius = Math.max(4, Math.round(shortSide * .022))
      if (handAware) {
        const limitX = Math.round(shortSide * radiusX); const limitY = Math.round(shortSide * radiusY)
        for (let y = Math.max(0, center.y - limitY); y <= Math.min(height - 1, center.y + limitY); y++) {
          for (let x = Math.max(0, center.x - limitX); x <= Math.min(width - 1, center.x + limitX); x++) {
            const dx = x - center.x; const dy = y - center.y
            if ((dx * dx) / (limitX * limitX) + (dy * dy) / (limitY * limitY) > 1 || Math.hypot(dx, dy) <= seedRadius * 2.2) continue
            const pixel = (y * width + x) * 4
            if (isLikelySkinPixel(source.data[pixel], source.data[pixel + 1], source.data[pixel + 2])) {
              mask.data[y * width + x] = Math.hypot(dx, dy) > shortSide * .13 ? cv.GC_BGD : cv.GC_PR_BGD
            }
          }
        }
      }
      cv.circle(mask, center, seedRadius, new cv.Scalar(cv.GC_FGD), -1)
      const backgroundModel = new cv.Mat(); const foregroundModel = new cv.Mat()
      const binaryMat = new cv.Mat(height, width, cv.CV_8UC1)
      const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
      try {
        cv.grabCut(rgb, mask, new cv.Rect(0, 0, 1, 1), backgroundModel, foregroundModel, iterations, cv.GC_INIT_WITH_MASK)
        for (let i = 0; i < mask.data.length; i++) binaryMat.data[i] = (mask.data[i] === cv.GC_FGD || mask.data[i] === cv.GC_PR_FGD) ? 255 : 0
        cv.morphologyEx(binaryMat, binaryMat, cv.MORPH_CLOSE, kernel)
        cv.morphologyEx(binaryMat, binaryMat, cv.MORPH_OPEN, kernel)
        return selectCenterComponent(binaryMat.data, width, height)
      } finally {
        backgroundModel.delete(); foregroundModel.delete(); binaryMat.delete(); kernel.delete()
      }
    }

    // The first pass covers a typical handheld object. If the mask leaks into a
    // large surface, a second stricter pass is preferred when it remains valid.
    let centered = runPass(.17, .20, 4)
    let count = 0; for (const value of centered) if (value) count++
    let ratio = count / centered.length
    if (ratio > .32) {
      const strict = runPass(.09, .10, 5)
      let strictCount = 0; for (const value of strict) if (value) strictCount++
      const strictRatio = strictCount / strict.length
      if (strictRatio >= .004 && strictRatio < ratio * .72) { centered = strict; count = strictCount; ratio = strictRatio }
    }
    if (ratio < .004 || ratio > .88) throw new Error('중앙 물체의 윤곽을 찾지 못했어요.')

    const maskCanvas = document.createElement('canvas'); maskCanvas.width = width; maskCanvas.height = height
    const maskContext = maskCanvas.getContext('2d')!
    const pixels = maskContext.createImageData(width, height)
    for (let i = 0; i < centered.length; i++) {
      pixels.data[i * 4] = 255; pixels.data[i * 4 + 1] = 255; pixels.data[i * 4 + 2] = 255; pixels.data[i * 4 + 3] = centered[i]
    }
    maskContext.putImageData(pixels, 0, 0)

    const outputScale = Math.min(1, OUTPUT_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const output = document.createElement('canvas')
    output.width = Math.max(2, Math.round(image.naturalWidth * outputScale)); output.height = Math.max(2, Math.round(image.naturalHeight * outputScale))
    const outputContext = output.getContext('2d')!
    outputContext.drawImage(image, 0, 0, output.width, output.height)
    outputContext.globalCompositeOperation = 'destination-in'
    if (feather > 0) outputContext.filter = `blur(${Math.min(2, feather * .55)}px)`
    outputContext.drawImage(maskCanvas, 0, 0, output.width, output.height)
    outputContext.filter = 'none'; outputContext.globalCompositeOperation = 'source-over'
    return output
  } finally {
    source.delete(); rgb.delete(); mask.delete()
  }
}
