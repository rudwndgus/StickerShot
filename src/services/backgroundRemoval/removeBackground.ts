const MAX_SIDE = 1280

export interface RemovalOptions { tolerance: number; feather: number }

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 열 수 없어요. JPG나 PNG 파일로 다시 시도해 주세요.'))
    image.src = url
  })
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('이미지를 저장 가능한 형태로 만들지 못했어요.')),
    type,
    quality
  ))
}

/**
 * Browser-only connected-background segmentation. It learns the background from
 * corner samples, then flood-fills only matching pixels connected to an edge.
 * This avoids erasing similarly coloured details enclosed by the foreground.
 */
export async function removeBackground(url: string, options: RemovalOptions): Promise<HTMLCanvasElement> {
  const image = await loadImage(url)
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, width, height)
  const frame = ctx.getImageData(0, 0, width, height)
  const data = frame.data
  const samplePoints = [0, width - 1, (height - 1) * width, width * height - 1]
  const bg = samplePoints.reduce((acc, i) => {
    acc[0] += data[i * 4]; acc[1] += data[i * 4 + 1]; acc[2] += data[i * 4 + 2]
    return acc
  }, [0, 0, 0]).map((n) => n / samplePoints.length)
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0; let tail = 0
  const enqueue = (i: number) => { if (!visited[i]) { visited[i] = 1; queue[tail++] = i } }
  for (let x = 0; x < width; x += 2) { enqueue(x); enqueue((height - 1) * width + x) }
  for (let y = 0; y < height; y += 2) { enqueue(y * width); enqueue(y * width + width - 1) }
  const threshold = 28 + options.tolerance * 1.1
  const accepted = new Uint8Array(width * height)
  while (head < tail) {
    const i = queue[head++]
    const p = i * 4
    const dr = data[p] - bg[0]; const dg = data[p + 1] - bg[1]; const db = data[p + 2] - bg[2]
    const distance = Math.sqrt(dr * dr * .3 + dg * dg * .55 + db * db * .15)
    if (distance > threshold) continue
    accepted[i] = 1
    const x = i % width
    if (x > 0) enqueue(i - 1)
    if (x < width - 1) enqueue(i + 1)
    if (i >= width) enqueue(i - width)
    if (i < width * (height - 1)) enqueue(i + width)
  }
  for (let i = 0; i < accepted.length; i++) {
    if (accepted[i]) data[i * 4 + 3] = 0
  }
  if (options.feather > 0) {
    const alpha = new Uint8ClampedArray(width * height)
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
    for (let pass = 0; pass < Math.min(3, options.feather); pass++) {
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = y * width + x
        if (alpha[i] && (!alpha[i - 1] || !alpha[i + 1] || !alpha[i - width] || !alpha[i + width])) data[i * 4 + 3] = 145
      }
    }
  }
  ctx.putImageData(frame, 0, 0)
  return trimTransparent(canvas)
}

export function trimTransparent(source: HTMLCanvasElement, padding = 10) {
  const ctx = source.getContext('2d', { willReadFrequently: true })!
  const { data } = ctx.getImageData(0, 0, source.width, source.height)
  let left = source.width; let top = source.height; let right = 0; let bottom = 0
  for (let y = 0; y < source.height; y += 2) for (let x = 0; x < source.width; x += 2) {
    if (data[(y * source.width + x) * 4 + 3] > 24) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
    }
  }
  if (right <= left || bottom <= top) throw new Error('물건을 분리하지 못했어요. 배경이 단순한 곳에서 다시 촬영해 주세요.')
  const out = document.createElement('canvas')
  const sx = Math.max(0, left - padding); const sy = Math.max(0, top - padding)
  const sw = Math.min(source.width - sx, right - left + padding * 2)
  const sh = Math.min(source.height - sy, bottom - top + padding * 2)
  out.width = sw; out.height = sh
  out.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return out
}

export function applyOutline(source: HTMLCanvasElement, width: number) {
  if (!width) return source
  const pad = width + 4
  const out = document.createElement('canvas')
  out.width = source.width + pad * 2; out.height = source.height + pad * 2
  const ctx = out.getContext('2d')!
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 0
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    ctx.drawImage(source, pad + Math.cos(a) * width, pad + Math.sin(a) * width)
  }
  ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height)
  ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(source, pad, pad)
  return out
}

export async function makeThumbnail(source: HTMLCanvasElement) {
  const scale = Math.min(1, 320 / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale)); canvas.height = Math.max(1, Math.round(source.height * scale))
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas)
}
