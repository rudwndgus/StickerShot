import type { GravityVector } from '../../types'

export function mapOrientationToGravity(beta: number, gamma: number, angle = 0): GravityVector {
  const x = Math.max(-1, Math.min(1, gamma / 27))
  const y = Math.max(-1, Math.min(1, beta / 27))
  if (angle === 90) return { x: y, y: -x }
  if (angle === -90 || angle === 270) return { x: -y, y: x }
  if (angle === 180) return { x: -x, y: -y }
  return { x, y }
}
