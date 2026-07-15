import { describe, expect, it } from 'vitest'
import { mapOrientationToGravity } from './gravityMapper'
import { smoothGravity } from './gravitySmoothing'

describe('device gravity', () => {
  it('maps portrait tilt and clamps extremes', () => {
    expect(mapOrientationToGravity(17.5, 35)).toEqual({ x: 1, y: .5 })
    expect(mapOrientationToGravity(200, -200)).toEqual({ x: -1, y: 1 })
  })
  it('corrects coordinates for landscape orientation', () => {
    expect(mapOrientationToGravity(17.5, 35, 90)).toEqual({ x: .5, y: -1 })
    expect(mapOrientationToGravity(17.5, 35, -90)).toEqual({ x: -.5, y: 1 })
  })
  it('smooths changes and applies a dead zone', () => {
    expect(smoothGravity({ x: 0, y: 0 }, { x: 1, y: .1 }, .1, .05)).toEqual({ x: .1, y: 0 })
  })
})
