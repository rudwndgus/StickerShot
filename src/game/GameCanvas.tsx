import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import type { StickerRecord, Point } from '../types'
import { worldToLocal } from './slicing/coordinateTransform'

interface Props {
  stickers: StickerRecord[]
  running: boolean
  onSlice: (sticker: StickerRecord, point: Point) => void
}

interface GameItem {
  body: Matter.Body
  image: HTMLImageElement
  sticker: StickerRecord
  width: number
  height: number
  sliced: boolean
  createdAt: number
  alpha: number
}

const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="190" viewBox="0 0 220 190"><path d="M31 78c-20-38 17-68 50-45 16-39 66-35 75 8 46-8 61 46 25 64 18 45-36 71-67 40-33 31-83 5-67-36-10-6-15-17-16-31z" fill="#ffdf4f" stroke="white" stroke-width="14"/><circle cx="86" cy="83" r="8" fill="#222"/><circle cx="139" cy="83" r="8" fill="#222"/><path d="M88 112q24 20 48 0" fill="none" stroke="#222" stroke-width="8" stroke-linecap="round"/></svg>`

function imageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = url })
}

export function GameCanvas({ stickers, running, onSlice }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliceCallback = useRef(onSlice); sliceCallback.current = onSlice
  const runningRef = useRef(running); runningRef.current = running
  useEffect(() => {
    const canvas = canvasRef.current!; const ctx = canvas.getContext('2d')!
    const engine = Matter.Engine.create(); engine.gravity.y = 1; engine.gravity.scale = .00105
    let width = 0; let height = 0; let dpr = 1; let frame = 0; let last = performance.now(); let spawnAt = 0
    const items: GameItem[] = []; const urls: string[] = []
    let trail: Array<Point & { at: number }> = []; let pointerDown = false
    const resize = () => { const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas)
    const sources = stickers.filter((s) => s.gameEnabled)
    const fallback: StickerRecord = { id: 'sample', name: '별콩이', createdAt: 0, image: new Blob(), thumbnail: new Blob(), originalWidth: 220, originalHeight: 190, storedBytes: 0, outline: 'classic', gameEnabled: true, slicedCount: 0, lastUsedAt: 0 }

    const spawn = async () => {
      const sticker = sources.length ? sources[Math.floor(Math.random() * sources.length)] : fallback
      const url = sticker.id === 'sample' ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sampleSvg)}` : URL.createObjectURL(sticker.thumbnail)
      if (sticker.id !== 'sample') urls.push(url)
      try {
        const image = await imageFromUrl(url); const max = 90 + Math.random() * 35; const ratio = image.naturalWidth / image.naturalHeight
        const w = ratio >= 1 ? max : max * ratio; const h = ratio >= 1 ? max / ratio : max
        const fromLeft = Math.random() < .5; const x = fromLeft ? 34 + Math.random() * width * .27 : width * .7 + Math.random() * width * .26
        const body = Matter.Bodies.rectangle(x, height + h, w * .72, h * .72, { frictionAir: .006, restitution: .5, angle: (Math.random() - .5) * .4 })
        Matter.Body.setVelocity(body, { x: fromLeft ? 2 + Math.random() * 2.5 : -2 - Math.random() * 2.5, y: -16 - Math.random() * 5 })
        Matter.Body.setAngularVelocity(body, (Math.random() - .5) * .13)
        Matter.Composite.add(engine.world, body); items.push({ body, image, sticker, width: w, height: h, sliced: false, createdAt: performance.now(), alpha: 1 })
      } catch { /* skip a corrupt texture without stopping the game */ }
    }

    const splitImage = (item: GameItem, a: Point, b: Point) => {
      const localA = worldToLocal(a, item.body.position, item.body.angle)
      const localB = worldToLocal(b, item.body.position, item.body.angle)
      const W = Math.max(2, Math.round(item.width)); const H = Math.max(2, Math.round(item.height))
      const dx = localB.x - localA.x; const dy = localB.y - localA.y; const length = Math.hypot(dx, dy) || 1
      const nx = -dy / length; const ny = dx / length
      const makeHalf = async (side: number) => {
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d')!
        const ax = localA.x + W / 2; const ay = localA.y + H / 2; const bx = localB.x + W / 2; const by = localB.y + H / 2
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(bx + nx * side * 1000, by + ny * side * 1000); x.lineTo(ax + nx * side * 1000, ay + ny * side * 1000); x.closePath(); x.clip()
        x.drawImage(item.image, 0, 0, W, H)
        const image = await imageFromUrl(c.toDataURL('image/png'))
        const body = Matter.Bodies.rectangle(item.body.position.x + nx * side * 4, item.body.position.y + ny * side * 4, item.width * .66, item.height * .66, { frictionAir: .008, angle: item.body.angle })
        Matter.Body.setVelocity(body, { x: item.body.velocity.x + nx * side * 3.5, y: item.body.velocity.y + ny * side * 3.5 })
        Matter.Body.setAngularVelocity(body, item.body.angularVelocity + side * .08)
        Matter.Composite.add(engine.world, body); items.push({ ...item, body, image, sliced: true, createdAt: performance.now(), alpha: 1 })
      }
      Matter.Composite.remove(engine.world, item.body); items.splice(items.indexOf(item), 1)
      void makeHalf(1); void makeHalf(-1)
    }

    const intersects = (item: GameItem, a: Point, b: Point) => {
      const la = worldToLocal(a, item.body.position, item.body.angle); const lb = worldToLocal(b, item.body.position, item.body.angle)
      const minX = Math.min(la.x, lb.x); const maxX = Math.max(la.x, lb.x); const minY = Math.min(la.y, lb.y); const maxY = Math.max(la.y, lb.y)
      if (maxX < -item.width / 2 || minX > item.width / 2 || maxY < -item.height / 2 || minY > item.height / 2) return false
      const dx = lb.x - la.x; const dy = lb.y - la.y
      const t = Math.max(0, Math.min(1, -(la.x * dx + la.y * dy) / (dx * dx + dy * dy || 1)))
      return Math.abs(la.x + dx * t) < item.width * .48 && Math.abs(la.y + dy * t) < item.height * .48
    }
    const point = (e: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: e.clientX - rect.left, y: e.clientY - rect.top } }
    const down = (e: PointerEvent) => { pointerDown = true; canvas.setPointerCapture(e.pointerId); trail = [{ ...point(e), at: performance.now() }] }
    const move = (e: PointerEvent) => {
      if (!pointerDown || !runningRef.current) return
      const p = point(e); const previous = trail.at(-1); if (!previous || Math.hypot(p.x - previous.x, p.y - previous.y) < 5) return
      trail.push({ ...p, at: performance.now() }); if (trail.length > 22) trail.shift()
      const speed = Math.hypot(p.x - previous.x, p.y - previous.y) / Math.max(1, performance.now() - previous.at)
      if (speed < .12) return
      const target = items.find((item) => !item.sliced && intersects(item, previous, p))
      if (target) { const center = { ...target.body.position }; const sticker = target.sticker; splitImage(target, previous, p); sliceCallback.current(sticker, center) }
    }
    const up = () => { pointerDown = false }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)

    const render = (now: number) => {
      const delta = Math.min(32, now - last); last = now
      if (runningRef.current) {
        Matter.Engine.update(engine, delta)
        if (now > spawnAt) { void spawn(); spawnAt = now + Math.max(430, 930 - Math.min(420, now / 30000 * 420)) }
      }
      ctx.clearRect(0, 0, width, height)
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.body.position.y > height + 180 || item.body.position.x < -180 || item.body.position.x > width + 180 || (item.sliced && now - item.createdAt > 4000)) {
          Matter.Composite.remove(engine.world, item.body); items.splice(i, 1); continue
        }
        ctx.save(); ctx.globalAlpha = item.alpha; ctx.translate(item.body.position.x, item.body.position.y); ctx.rotate(item.body.angle)
        ctx.shadowColor = 'rgba(20,10,30,.2)'; ctx.shadowBlur = 10; ctx.drawImage(item.image, -item.width / 2, -item.height / 2, item.width, item.height); ctx.restore()
      }
      trail = trail.filter((p) => now - p.at < 260)
      if (trail.length > 1) {
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14
        for (let i = 1; i < trail.length; i++) { const alpha = i / trail.length; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 2 + alpha * 7; ctx.stroke() }
        const end = trail.at(-1)!; ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
      }
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(frame); ro.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); urls.forEach(URL.revokeObjectURL); Matter.World.clear(engine.world, false); Matter.Engine.clear(engine) }
  }, [stickers])
  return <canvas ref={canvasRef} className="game-canvas" />
}
