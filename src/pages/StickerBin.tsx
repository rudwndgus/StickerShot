import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Check, Compass, RotateCcw, Settings2, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStickers } from '../app/StickerContext'
import { EmptySticker } from '../components/EmptySticker'
import { StickerPhysicsCanvas, type PhysicsCanvasHandle } from '../physics/stickerBin/StickerPhysicsCanvas'
import { mapOrientationToGravity } from '../physics/deviceGravity/gravityMapper'
import { smoothGravity } from '../physics/deviceGravity/gravitySmoothing'
import { requestOrientationPermission } from '../physics/deviceGravity/deviceOrientationPermission'
import { detectShake, type MotionSample } from '../physics/deviceGravity/shakeDetector'
import type { GravityVector, StickerRecord } from '../types'

export function StickerBin() {
  const navigate = useNavigate()
  const { stickers, remove, update } = useStickers()
  const [gravity, setGravity] = useState<GravityVector>({ x: 0, y: 0 })
  const [tiltEnabled, setTiltEnabled] = useState(false)
  const [showPermission, setShowPermission] = useState(() => !localStorage.getItem('stickershot-tilt-seen'))
  const [selected, setSelected] = useState<StickerRecord | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [name, setName] = useState('')
  const physics = useRef<PhysicsCanvasHandle | null>(null)
  const gravityRef = useRef(gravity); gravityRef.current = gravity
  const lastMotion = useRef<MotionSample | null>(null)
  const lastShakeAt = useRef(0)

  useEffect(() => {
    if (!tiltEnabled) return
    const listener = (event: DeviceOrientationEvent) => {
      const angle = screen.orientation?.angle ?? 0
      const mapped = mapOrientationToGravity(event.beta ?? 0, event.gamma ?? 0, angle)
      setGravity(smoothGravity(gravityRef.current, mapped))
    }
    const motionListener = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity
      if (acceleration?.x == null || acceleration.y == null || acceleration.z == null) return
      const current = { x: acceleration.x, y: acceleration.y, z: acceleration.z }
      const shake = detectShake(lastMotion.current, current)
      lastMotion.current = current
      const now = performance.now()
      if (shake && now - lastShakeAt.current > 115) {
        lastShakeAt.current = now
        physics.current?.shake(shake.strength, shake.direction)
      }
    }
    window.addEventListener('deviceorientation', listener)
    window.addEventListener('devicemotion', motionListener)
    return () => {
      window.removeEventListener('deviceorientation', listener)
      window.removeEventListener('devicemotion', motionListener)
      lastMotion.current = null
    }
  }, [tiltEnabled])

  const enableTilt = async () => {
    try { setTiltEnabled(await requestOrientationPermission()) } catch { setTiltEnabled(false) }
    localStorage.setItem('stickershot-tilt-seen', '1'); setShowPermission(false)
  }
  const selectSticker = useCallback((sticker: StickerRecord) => { setSelected(sticker); setName(sticker.name) }, [])

  return <main className="bin-page">
    <div className="bin-dots" />
    <header className="bin-header">
      <button className="icon-btn icon-btn--glass" onClick={() => navigate('/')}><ArrowLeft /></button>
      <div><small>MY STICKER BIN</small><b>{stickers.length}개의 물건</b></div>
      <button className="icon-btn icon-btn--glass" onClick={() => setShowPermission(true)}><Settings2 /></button>
    </header>
    <div className="bin-toolbar">
      <button onClick={() => navigate('/capture')}><Camera /> 새 스티커</button>
      <button onClick={() => physics.current?.reset()}><RotateCcw /> 쏟기</button>
      <button className={tiltEnabled ? 'active' : ''} onClick={() => tiltEnabled ? setTiltEnabled(false) : void enableTilt()}><Compass /> 기울기 {tiltEnabled ? 'ON' : 'OFF'}</button>
    </div>
    {stickers.length ? <StickerPhysicsCanvas stickers={stickers} gravity={gravity} onLongPress={selectSticker} onActiveCount={setActiveCount} apiRef={physics} /> : <div className="bin-empty"><EmptySticker /><h1>스티커 통이 텅 비었어요</h1><p>물건을 찍어 첫 스티커를 만들어 보세요.</p><button className="btn btn--ink" onClick={() => navigate('/capture')}><Camera /> 스티커 만들기</button></div>}
    {stickers.length > activeCount && <div className="active-count">성능을 위해 최근 {activeCount}개를 보여주고 있어요</div>}
    <div className="bin-floor"><span>살짝 기울이고, 세게 흔들어 보세요!</span></div>

    {showPermission && <div className="modal-backdrop"><section className="permission-card">
      <button className="modal-close" onClick={() => { localStorage.setItem('stickershot-tilt-seen', '1'); setShowPermission(false) }}><X /></button>
      <div className="permission-card__icon"><Compass /></div><small>REAL PHYSICS</small><h2>기울기·흔들기를 켤까요?</h2><p>살짝 기울이면 데굴데굴,<br />세게 흔들면 스티커들이 마구 튀어요!</p>
      <button className="btn btn--primary" onClick={() => void enableTilt()}><Compass /> 움직임 효과 켜기</button><button className="text-btn" onClick={() => setShowPermission(false)}>나중에</button>
    </section></div>}

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="detail-sheet" onClick={(e) => e.stopPropagation()}>
      <div className="sheet-handle" /><button className="modal-close" onClick={() => setSelected(null)}><X /></button>
      <img src={URL.createObjectURL(selected.image)} alt={selected.name} onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
      <label>스티커 이름<input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /></label>
      <div className="detail-stats"><span><b>{new Date(selected.createdAt).toLocaleDateString('ko-KR')}</b><small>만든 날</small></span><span><b>{selected.slicedCount}회</b><small>베어낸 횟수</small></span></div>
      <label className="toggle-row"><span><b>게임에 등장</b><small>StickerShot 게임에서 만나요</small></span><input type="checkbox" checked={selected.gameEnabled} onChange={(e) => void update(selected.id, { gameEnabled: e.target.checked })} /></label>
      <div className="sheet-actions"><button className="btn btn--danger" onClick={() => { if (confirm('이 스티커를 삭제할까요?')) { void remove(selected.id); setSelected(null) } }}><Trash2 /> 삭제</button><button className="btn btn--primary" onClick={() => { void update(selected.id, { name: name.trim() || selected.name }); setSelected(null) }}><Check /> 저장</button></div>
    </section></div>}
  </main>
}
