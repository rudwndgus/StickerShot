import { describe, expect, it } from 'vitest'
import { localToWorld, worldToLocal } from './coordinateTransform'
import { polygonArea, splitConvexPolygon } from './sliceIntersection'

describe('image slicing math', () => {
  it('splits a polygon into left and right regions', () => {
    const square = [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }]
    const result = splitConvexPolygon(square, { x: 0, y: -20 }, { x: 0, y: 20 })
    expect(polygonArea(result.left)).toBeCloseTo(200)
    expect(polygonArea(result.right)).toBeCloseTo(200)
  })
  it('rejects tiny slice areas at the caller threshold', () => {
    const square = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
    const result = splitConvexPolygon(square, { x: 2, y: -10 }, { x: 2, y: 110 })
    const ratio = Math.min(polygonArea(result.left), polygonArea(result.right)) / polygonArea(square)
    expect(ratio).toBeLessThan(.05)
  })
  it('round-trips rotated and scaled coordinates', () => {
    const world = { x: 144, y: 83 }; const center = { x: 100, y: 50 }
    const local = worldToLocal(world, center, Math.PI / 6, 1.5, .75)
    const restored = localToWorld(local, center, Math.PI / 6, 1.5, .75)
    expect(restored.x).toBeCloseTo(world.x)
    expect(restored.y).toBeCloseTo(world.y)
  })
})
