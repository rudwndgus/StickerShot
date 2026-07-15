import { useEffect, useMemo, useState } from 'react'
import { Check, ImagePlus, RotateCcw, Save, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Toast } from '../components/Toast'
import { useStickers } from '../app/StickerContext'
import type { OutlineStyle, StickerRecord } from '../types'
import { applyOutline, canvasToBlob, loadImage, makeThumbnail } from '../services/backgroundRemoval/removeBackground'

const outlineWidths: Record<OutlineStyle, number> = { none: 0, thin: 4, classic: 10, bold: 18 }
const labels: Record<OutlineStyle, string> = { none: '없음', thin: '얇게', classic: '기본', bold: '두껍게' }

export function StickerEditor() {
  const navigate = useNavigate()
  const location = useLocation()
  const { add } = useStickers()
  const state = location.state as { sourceUrl?: string; processedUrl?: string } | null
  const [name, setName] = useState('나의 스티커')
  const [outline, setOutline] = useState<OutlineStyle>('classic')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const previewStyle = useMemo(() => ({ '--outline': `${outlineWidths[outline] / 2}px` }) as React.CSSProperties, [outline])
  useEffect(() => { if (!state?.processedUrl) navigate('/capture', { replace: true }) }, [navigate, state])
  if (!state?.processedUrl) return null

  const save = async () => {
    if (!name.trim()) return setMessage('스티커 이름을 적어 주세요.')
    setSaving(true)
    try {
      const image = await loadImage(state.processedUrl!)
      const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight
      source.getContext('2d')!.drawImage(image, 0, 0)
      const finalCanvas = applyOutline(source, outlineWidths[outline])
      const imageBlob = await canvasToBlob(finalCanvas)
      const thumbnail = await makeThumbnail(finalCanvas)
      const sticker: StickerRecord = {
        id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now(), image: imageBlob, thumbnail,
        originalWidth: finalCanvas.width, originalHeight: finalCanvas.height, storedBytes: imageBlob.size + thumbnail.size,
        outline, gameEnabled: true, slicedCount: 0, lastUsedAt: Date.now()
      }
      await add(sticker)
      setMessage('스티커 통에 쏙 들어갔어요!')
      window.setTimeout(() => navigate('/bin', { replace: true, state: { justAdded: sticker.id } }), 520)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '저장 공간이 부족해 스티커를 저장하지 못했어요.')
      setSaving(false)
    }
  }

  return <main className="page editor-page">
    <AppHeader back title="스티커 완성" action={<button className="text-btn" onClick={() => navigate('/capture')}>다시 찍기</button>} />
    <section className="editor-stage">
      <div className="checkerboard" />
      <div className="editor-sparkles"><span>✦</span><span>✧</span><span>✦</span></div>
      <img className={`editor-preview outline-${outline}`} style={previewStyle} src={state.processedUrl} alt="완성된 스티커 미리보기" />
      <span className="success-badge"><Check /> 배경 제거 완료</span>
    </section>
    <section className="editor-panel">
      <label className="field-label" htmlFor="sticker-name">이 물건의 이름은?</label>
      <input id="sticker-name" className="name-input" value={name} maxLength={24} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setName(e.target.value)} />
      <div className="option-title"><div><b>스티커 테두리</b><small>취향에 맞게 골라보세요</small></div><Sparkles size={18} /></div>
      <div className="outline-options">
        {(Object.keys(labels) as OutlineStyle[]).map((item) => <button key={item} className={outline === item ? 'selected' : ''} onClick={() => setOutline(item)}>
          <span className={`outline-swatch outline-swatch--${item}`}>★</span><small>{labels[item]}</small>
        </button>)}
      </div>
      <div className="editor-actions">
        <button className="btn btn--secondary" onClick={() => navigate('/capture')}><ImagePlus /> 다른 사진</button>
        <button className="btn btn--primary" disabled={saving} onClick={() => void save()}>{saving ? <RotateCcw className="spin" /> : <Save />}{saving ? '저장 중…' : '스티커 저장'}</button>
      </div>
    </section>
    <Toast message={message} />
  </main>
}
