export type OutlineStyle = 'none' | 'thin' | 'classic' | 'bold'

export interface StickerRecord {
  id: string
  name: string
  createdAt: number
  image: Blob
  thumbnail: Blob
  originalWidth: number
  originalHeight: number
  storedBytes: number
  outline: OutlineStyle
  gameEnabled: boolean
  slicedCount: number
  lastUsedAt: number
}

export type RouteState =
  | { kind: 'scan'; sourceUrl: string }
  | { kind: 'editor'; sourceUrl: string; processedUrl: string }

export interface GravityVector { x: number; y: number }
export interface Point { x: number; y: number }
export interface SliceResult { left: Point[]; right: Point[] }
