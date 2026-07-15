import type { GravityVector } from '../../types'

export const MAX_TILT_GRAVITY = .48

function softenTilt(degrees: number) {
  // A normal viewing angle should feel like a gentle slope, not full gravity.
  // tanh keeps small tilts responsive while approaching a hard, smooth limit.
  return Math.tanh(degrees / 28) * MAX_TILT_GRAVITY
}

export function mapOrientationToGravity(beta: number, gamma: number, angle = 0): GravityVector {
  const x = softenTilt(gamma)
  const y = softenTilt(beta)
  if (angle === 90) return { x: y, y: -x }
  if (angle === -90 || angle === 270) return { x: -y, y: x }
  if (angle === 180) return { x: -x, y: -y }
  return { x, y }
}
