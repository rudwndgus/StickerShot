import type { GravityVector } from '../../types'

export function smoothGravity(previous: GravityVector, next: GravityVector, alpha = 0.25, deadZone = 0.03): GravityVector {
  const clean = (n: number) => Math.abs(n) < deadZone ? 0 : Math.max(-1, Math.min(1, n))
  return {
    x: clean(previous.x + (next.x - previous.x) * alpha),
    y: clean(previous.y + (next.y - previous.y) * alpha)
  }
}
