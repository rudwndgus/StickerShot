export interface MotionSample { x: number; y: number; z: number }

export interface ShakeResult {
  strength: number
  direction: { x: number; y: number }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Turns a sudden acceleration change into a short, bounded physics kick. */
export function detectShake(previous: MotionSample | null, current: MotionSample, threshold = 6.5): ShakeResult | null {
  if (!previous) return null
  const dx = current.x - previous.x
  const dy = current.y - previous.y
  const dz = current.z - previous.z
  const jerk = Math.hypot(dx, dy, dz)
  if (jerk < threshold) return null

  return {
    strength: clamp(.75 + (jerk - threshold) / 7, .75, 2.8),
    direction: { x: clamp(dx / 10, -1, 1), y: clamp(-dy / 10, -1, 1) }
  }
}
