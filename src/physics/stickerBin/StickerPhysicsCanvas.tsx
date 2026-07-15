import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import type { StickerRecord, GravityVector } from '../../types'

export interface PhysicsCanvasHandle { reset: () => void }

interface Props {
  stickers: StickerRecord[]
  gravity: GravityVector
  onLongPress: (sticker: StickerRecord) => void
  onActiveCount?: (count: number) => void
  apiRef?: React.MutableRefObject<PhysicsCanvasHandle | null>
}

interface SpriteBody { body: Matter.Body; sticker: StickerRecord; image: HTMLImageElement; width: number; height: number }

export function StickerPhysicsCanvas({ stickers, gravity, onLongPress, onActiveCount, apiRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const longPressCallback = useRef(onLongPress)
  longPressCallback.current = onLongPress
  const gravityValue = useRef(gravity)
  gravityValue.current = gravity

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const engine = Matter.Engine.create({ enableSleeping: true })
    engine.gravity.scale = .0018
    const sprites: SpriteBody[] = []
    let frame = 0; let width = 0; let height = 0; let dpr = 1
    let drag: { body: Matter.Body; pointerId: number; lastX: number; lastY: number; lastTime: number; timer: number; moved: boolean } | null = null
    const urls: string[] = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const thickness = 100
      Matter.Composite.remove(engine.world, Matter.Composite.allBodies(engine.world).filter((b) => b.isStatic))
      Matter.Composite.add(engine.world, [
        Matter.Bodies.rectangle(width / 2, height + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
        Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 3, { isStatic: true }),
        Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 3, { isStatic: true }),
        Matter.Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, { isStatic: true })
      ])
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    const selected = stickers.slice(0, 22)
    onActiveCount?.(selected.length)
    selected.forEach((sticker, index) => {
      const image = new Image(); const url = URL.createObjectURL(sticker.thumbnail); urls.push(url)
      image.src = url
      image.onload = () => {
        const max = Math.max(58, Math.min(104, width / 3.5)); const ratio = image.naturalWidth / image.naturalHeight
        const w = ratio >= 1 ? max : max * ratio; const h = ratio >= 1 ? max / ratio : max
        const body = Matter.Bodies.rectangle(36 + Math.random() * Math.max(20, width - 72), -70 - index * 28, w * .78, h * .78, {
          restitution: .68, friction: .28, frictionAir: .012, density: .0015, angle: (Math.random() - .5) * .6,
          chamfer: { radius: Math.min(w, h) * .18 }, sleepThreshold: 90
        })
        Matter.Body.setAngularVelocity(body, (Math.random() - .5) * .05)
        sprites.push({ body, sticker, image, width: w, height: h }); Matter.Composite.add(engine.world, body)
      }
    })

    const pointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      const p = pointer(event)
      const found = [...sprites].reverse().find(({ body, width: w, height: h }) => Math.abs(p.x - body.position.x) < w / 2 && Math.abs(p.y - body.position.y) < h / 2)
      if (!found) return
      canvas.setPointerCapture(event.pointerId)
      Matter.Sleeping.set(found.body, false)
      const timer = window.setTimeout(() => { if (drag && !drag.moved) { longPressCallback.current(found.sticker); drag = null } }, 520)
      drag = { body: found.body, pointerId: event.pointerId, lastX: p.x, lastY: p.y, lastTime: performance.now(), timer, moved: false }
    }
    const move = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return
      const p = pointer(event); const now = performance.now(); const dt = Math.max(8, now - drag.lastTime)
      if (Math.hypot(p.x - drag.lastX, p.y - drag.lastY) > 6) { drag.moved = true; clearTimeout(drag.timer) }
      Matter.Body.setPosition(drag.body, p)
      Matter.Body.setVelocity(drag.body, { x: (p.x - drag.lastX) / dt * 12, y: (p.y - drag.lastY) / dt * 12 })
      drag.lastX = p.x; drag.lastY = p.y; drag.lastTime = now
    }
    const up = () => { if (drag) clearTimeout(drag.timer); drag = null }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up)

    let last = performance.now()
    const render = (now: number) => {
      const delta = Math.min(32, now - last); last = now
      engine.gravity.x = gravityValue.current.x; engine.gravity.y = .72 + gravityValue.current.y
      Matter.Engine.update(engine, delta)
      ctx.clearRect(0, 0, width, height)
      sprites.forEach(({ body, image, width: w, height: h }) => {
        ctx.save(); ctx.translate(body.position.x, body.position.y); ctx.rotate(body.angle)
        ctx.shadowColor = 'rgba(26, 24, 42, .20)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 6
        ctx.drawImage(image, -w / 2, -h / 2, w, h); ctx.restore()
      })
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    if (apiRef) apiRef.current = { reset: () => sprites.forEach(({ body }, index) => {
      Matter.Body.setPosition(body, { x: 40 + Math.random() * Math.max(10, width - 80), y: -40 - index * 20 })
      Matter.Body.setVelocity(body, { x: 0, y: 0 })
    }) }
    return () => {
      cancelAnimationFrame(frame); ro.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      Matter.World.clear(engine.world, false); Matter.Engine.clear(engine); urls.forEach(URL.revokeObjectURL); if (apiRef) apiRef.current = null
    }
  }, [stickers, onActiveCount, apiRef])
  return <canvas ref={canvasRef} className="physics-canvas" aria-label="물리 효과가 적용된 나의 스티커" />
}
