import type { Point, SliceResult } from '../../types'

export function lineSide(point: Point, a: Point, b: Point) {
  return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
}

/** Clips a convex polygon into the two half-planes created by a slice line. */
export function splitConvexPolygon(polygon: Point[], a: Point, b: Point): SliceResult {
  const clip = (positive: boolean) => {
    const output: Point[] = []
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i]; const next = polygon[(i + 1) % polygon.length]
      const currentSide = lineSide(current, a, b); const nextSide = lineSide(next, a, b)
      const inside = positive ? currentSide >= 0 : currentSide <= 0
      const nextInside = positive ? nextSide >= 0 : nextSide <= 0
      if (inside) output.push(current)
      if (inside !== nextInside) {
        const t = currentSide / (currentSide - nextSide)
        output.push({ x: current.x + (next.x - current.x) * t, y: current.y + (next.y - current.y) * t })
      }
    }
    return output
  }
  return { left: clip(true), right: clip(false) }
}

export function polygonArea(points: Point[]) {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length]
    return sum + p.x * next.y - next.x * p.y
  }, 0) / 2)
}
