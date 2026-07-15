import { useEffect, useState } from 'react'
import { Check, ScanLine, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { removeBackground, canvasToBlob } from '../services/backgroundRemoval/removeBackground'

const stages = ['인식 엔진 준비 중', '중앙 물체 고정 중', '물체 윤곽 학습 중', '배경과 물체 분리 중', '가장자리 다듬는 중']

export function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const sourceUrl = (location.state as { sourceUrl?: string } | null)?.sourceUrl
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [processedUrl, setProcessedUrl] = useState('')
  const [peeling, setPeeling] = useState(false)
  useEffect(() => {
    if (!sourceUrl) { navigate('/capture', { replace: true }); return }
    let cancelled = false
    const timers: number[] = []
    const started = Date.now()
    const ticker = window.setInterval(() => setStage((value) => Math.min(4, value + 1)), 390)
    removeBackground(sourceUrl, { tolerance: 35, feather: 2 }).then(async (canvas) => {
      const minimumDelay = Math.max(0, 1900 - (Date.now() - started))
      await new Promise((resolve) => window.setTimeout(resolve, minimumDelay))
      if (cancelled) return
      const blob = await canvasToBlob(canvas)
      const resultUrl = URL.createObjectURL(blob)
      window.clearInterval(ticker); setStage(5); setDone(true)
      setProcessedUrl(resultUrl)
      timers.push(window.setTimeout(() => setPeeling(true), 80))
      timers.push(window.setTimeout(() => navigate('/editor', { replace: true, state: { sourceUrl, processedUrl: resultUrl } }), 2350))
    }).catch((reason: Error) => { if (!cancelled) { window.clearInterval(ticker); setError(reason.message) } })
    return () => { cancelled = true; window.clearInterval(ticker); timers.forEach(window.clearTimeout) }
  }, [navigate, sourceUrl])
  if (!sourceUrl) return null
  return <main className={`scan-page ${peeling ? 'scan-page--peeling' : ''}`}>
    <div className={`scan-image-wrap ${peeling ? 'scan-image-wrap--peeling' : ''}`}>
      <img className="scan-source-photo" src={sourceUrl} alt="분석할 사진" />
      {processedUrl && <div className="peel-sticker" aria-label="원본 사진에서 떼어낸 스티커">
        <img src={processedUrl} alt="배경이 제거된 물건" /><span className="peel-curl" /><i>PEEL!</i>
      </div>}
      <div className={`scan-line ${done ? 'scan-line--done' : ''}`}><ScanLine /></div>
      <div className="scan-target"><span /><small>이 물체를 찾는 중</small></div>
      <i className="focus-corner focus-corner--a" /><i className="focus-corner focus-corner--b" /><i className="focus-corner focus-corner--c" /><i className="focus-corner focus-corner--d" />
      <div className="scan-dots"><i /><i /><i /><i /><i /><i /></div>
    </div>
    <section className={`scan-status ${peeling ? 'scan-status--peeling' : ''}`}>
      <span className={done ? 'scan-status__icon scan-status__icon--done' : 'scan-status__icon'}>{done ? <Check /> : <Sparkles />}</span>
      <div><small>STICKERSHOT AI</small><h1>{error || (peeling ? '원본에서 스티커 떼는 중!' : done ? 'StickerShot 완료!' : stages[stage])}</h1><p>{error ? '다른 사진으로 다시 시도해 주세요.' : peeling ? '배경은 사라지고 물건만 남아요.' : '사진 속 물건을 스티커로 바꾸고 있어요.'}</p></div>
      {!error && <div className="scan-progress"><span style={{ width: `${Math.min(100, (stage + 1) * 19)}%` }} /></div>}
      {error && <button className="btn btn--primary" onClick={() => navigate('/capture', { replace: true })}>다시 촬영하기</button>}
    </section>
  </main>
}
