import { describe, expect, it } from 'vitest'
import { mapOrientationToGravity } from './gravityMapper'
import { smoothGravity } from './gravitySmoothing'
import { detectShake } from './shakeDetector'

describe('device gravity', () => {
  it('maps portrait tilt and clamps extremes', () => {
    expect(mapOrientationToGravity(13.5, 27)).toEqual({ x: 1, y: .5 })
    expect(mapOrientationToGravity(200, -200)).toEqual({ x: -1, y: 1 })
  })
  it('corrects coordinates for landscape orientation', () => {
    expect(mapOrientationToGravity(13.5, 27, 90)).toEqual({ x: .5, y: -1 })
    expect(mapOrientationToGravity(13.5, 27, -90)).toEqual({ x: -.5, y: 1 })
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
