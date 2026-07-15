import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import type { StickerRecord, GravityVector } from '../../types'

export interface PhysicsCanvasHandle {
  reset: () => void
  shake: (strength: number, direction: GravityVector) => void
}

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
    engine.gravity.scale = .00175
    const sprites: SpriteBody[] = []
    let frame = 0; let width = 0; let height = 0; let dpr = 1
    let drag: { body: Matter.Body; pointerId: number; lastX: number; lastY: number; lastTime: number; timer: number; moved: boolean } | null = null
    const urls: string[] = []
    const pourTimers: number[] = []
    let topTimer = 0
    let topClosed = false
    let topWall: Matter.Body | null = null
    let sideBoundaries: Matter.Body[] = []

    const addTopWall = () => {
      if (topWall || !width) return
      const thickness = 100
      topWall = Matter.Bodies.rectangle(width / 2, -thickness / 2, width + thickness * 2, thickness, { isStatic: true })
      Matter.Composite.add(engine.world, topWall)
      topClosed = true
    }

    const openTop = () => {
      window.clearTimeout(topTimer)
      if (topWall) Matter.Composite.remove(engine.world, topWall)
      topWall = null; topClosed = false
    }

    const closeTopAfter = (delay: number) => {
      window.clearTimeout(topTimer)
      topTimer = window.setTimeout(addTopWall, delay)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const thickness = 100
      // Keep Matter's floor aligned with the visible top edge of the bin base.
      // Otherwise stickers settle at the viewport bottom and disappear behind it.
      const floorInset = Number.parseFloat(getComputedStyle(canvas).getPropertyValue('--bin-floor-visible-height')) || 54
      const floorY = height - floorInset
      sideBoundaries.forEach((body) => Matter.Composite.remove(engine.world, body))
      if (topWall) Matter.Composite.remove(engine.world, topWall)
      topWall = null
      sideBoundaries = [
        Matter.Bodies.rectangle(width / 2, floorY + thickness / 2, width + thickness * 2, thickness, { isStatic: true }),
        Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 3, { isStatic: true }),
        Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 3, { isStatic: true })
      ]
      Matter.Composite.add(engine.world, sideBoundaries)
      if (topClosed) addTopWall()
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)

    const selected = stickers.slice(0, 22)
    onActiveCount?.(selected.length)
    let loadedCount = 0
    selected.forEach((sticker, index) => {
      const image = new Image(); const url = URL.createObjectURL(sticker.thumbnail); urls.push(url)
      image.onload = () => {
        const max = Math.max(58, Math.min(104, width / 3.5)); const ratio = image.naturalWidth / image.naturalHeight
        const w = ratio >= 1 ? max : max * ratio; const h = ratio >= 1 ? max / ratio : max
        const body = Matter.Bodies.rectangle(36 + Math.random() * Math.max(20, width - 72), -h * .28, w * .78, h * .78, {
          restitution: .76, friction: .19, frictionStatic: .22, frictionAir: .006, density: .00115, angle: (Math.random() - .5) * .6,
          chamfer: { radius: Math.min(w, h) * .18 }, sleepThreshold: 90
        })
        const timer = window.setTimeout(() => {
          Matter.Body.setVelocity(body, { x: (Math.random() - .5) * 1.4, y: 1.2 + Math.random() * 1.6 })
          Matter.Body.setAngularVelocity(body, (Math.random() - .5) * .065)
          sprites.push({ body, sticker, image, width: w, height: h }); Matter.Composite.add(engine.world, body)
        }, index * 85)
        pourTimers.push(timer)
        loadedCount++
        if (loadedCount === selected.length) closeTopAfter(selected.length * 85 + 1100)
      }
      image.onerror = () => { loadedCount++; if (loadedCount === selected.length) closeTopAfter(selected.length * 85 + 1100) }
      image.src = url
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
    if (apiRef) apiRef.current = {
      reset: () => {
        openTop()
        sprites.forEach(({ body, height: h }, index) => {
          Matter.Sleeping.set(body, false)
          const timer = window.setTimeout(() => {
            Matter.Body.setPosition(body, { x: 40 + Math.random() * Math.max(10, width - 80), y: -h * .28 })
            Matter.Body.setVelocity(body, { x: (Math.random() - .5) * 1.5, y: 1.4 + Math.random() * 1.5 })
            Matter.Body.setAngularVelocity(body, (Math.random() - .5) * .07)
          }, index * 65)
          pourTimers.push(timer)
        })
        closeTopAfter(sprites.length * 65 + 1000)
      },
      shake: (strength, direction) => {
        const power = Math.max(.75, Math.min(2.8, strength))
        sprites.forEach(({ body }, index) => {
          Matter.Sleeping.set(body, false)
          const scatter = (Math.random() - .5) * 13 * power
          const lift = (5 + Math.random() * 7) * power
          Matter.Body.setVelocity(body, {
            x: Math.max(-25, Math.min(25, body.velocity.x + direction.x * 9 * power + scatter)),
            y: Math.max(-29, Math.min(18, body.velocity.y + direction.y * 6 * power - lift))
          })
          Matter.Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - .5) * .34 * power + (index % 2 ? .04 : -.04))
        })
      }
    }
    return () => {
      cancelAnimationFrame(frame); ro.disconnect(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up)
      pourTimers.forEach(window.clearTimeout); window.clearTimeout(topTimer)
      Matter.World.clear(engine.world, false); Matter.Engine.clear(engine); urls.forEach(URL.revokeObjectURL); if (apiRef) apiRef.current = null
    }
  }, [stickers, onActiveCount, apiRef])
  return <canvas ref={canvasRef} className="physics-canvas" aria-label="물리 효과가 적용된 나의 스티커" />
}
