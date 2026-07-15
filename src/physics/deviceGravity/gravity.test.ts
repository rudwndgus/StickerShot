import { describe, expect, it } from 'vitest'
import { mapOrientationToGravity, MAX_TILT_GRAVITY } from './gravityMapper'
import { smoothGravity } from './gravitySmoothing'
import { detectShake } from './shakeDetector'

describe('device gravity', () => {
  it('maps portrait tilt with a soft limit for normal viewing angles', () => {
    const normalViewingAngle = mapOrientationToGravity(45, 10)
    expect(normalViewingAngle.y).toBeGreaterThan(.4)
    expect(normalViewingAngle.y).toBeLessThanOrEqual(MAX_TILT_GRAVITY)
    const extreme = mapOrientationToGravity(200, -200)
    expect(extreme.x).toBeCloseTo(-MAX_TILT_GRAVITY, 5)
    expect(extreme.y).toBeCloseTo(MAX_TILT_GRAVITY, 5)
  })
  it('corrects coordinates for landscape orientation', () => {
    const portrait = mapOrientationToGravity(14, 28)
    expect(mapOrientationToGravity(14, 28, 90)).toEqual({ x: portrait.y, y: -portrait.x })
    expect(mapOrientationToGravity(14, 28, -90)).toEqual({ x: -portrait.y, y: portrait.x })
  })
  it('smooths changes and applies a dead zone', () => {
    expect(smoothGravity({ x: 0, y: 0 }, { x: 1, y: .1 }, .1, .05)).toEqual({ x: .1, y: 0 })
  })
  it('ignores normal motion and turns a hard shake into a bounded kick', () => {
    expect(detectShake({ x: 0, y: 0, z: 9.8 }, { x: 1, y: 1, z: 9 })).toBeNull()
    expect(detectShake({ x: 0, y: 0, z: 9.8 }, { x: 16, y: -12, z: 2 })).toEqual({
      strength: 2.8,
      direction: { x: 1, y: 1 }
    })
  })
})
