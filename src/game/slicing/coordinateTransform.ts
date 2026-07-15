import type { Point } from '../../types'

export function worldToLocal(point: Point, center: Point, rotation: number, scaleX = 1, scaleY = 1): Point {
  const dx = point.x - center.x; const dy = point.y - center.y
  const cos = Math.cos(-rotation); const sin = Math.sin(-rotation)
  return { x: (dx * cos - dy * sin) / scaleX, y: (dx * sin + dy * cos) / scaleY }
}

export function localToWorld(point: Point, center: Point, rotation: number, scaleX = 1, scaleY = 1): Point {
  const x = point.x * scaleX; const y = point.y * scaleY
  const cos = Math.cos(rotation); const sin = Math.sin(rotation)
  return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos }
}
