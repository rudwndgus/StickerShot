import { describe, expect, it } from 'vitest'
import { selectCenterComponent } from './centerGrabCut'

describe('center-target foreground selection', () => {
  it('keeps the object touching the center and rejects a separate object', () => {
    const width = 9; const height = 7; const mask = new Uint8Array(width * height)
    for (let y = 2; y <= 4; y++) for (let x = 3; x <= 5; x++) mask[y * width + x] = 1
    mask[1 * width + 1] = 1; mask[1 * width + 2] = 1
    const result = selectCenterComponent(mask, width, height)
    expect(result[3 * width + 4]).toBe(255)
    expect(result[1 * width + 1]).toBe(0)
    expect([...result].filter(Boolean)).toHaveLength(9)
  })

  it('finds the nearest foreground when the exact center is transparent', () => {
    const width = 7; const height = 7; const mask = new Uint8Array(width * height)
    mask[3 * width + 4] = 1; mask[3 * width + 5] = 1
    expect(selectCenterComponent(mask, width, height)[3 * width + 4]).toBe(255)
  })
})
