import { useEffect, useState } from 'react'
import { Check, ScanLine, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { removeBackground, canvasToBlob } from '../services/backgroundRemoval/removeBackground'

const stages = ['이미지 불러오는 중', '물건 탐색 중', '윤곽 분석 중', '배경과 물체 분리 중', '스티커 다듬는 중']

export function Scan() {
  const navigate = useNavigate()
  const location = useLocation()
  const sourceUrl = (location.state as { sourceUrl?: string } | null)?.sourceUrl
  const [stage, setStage] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!sourceUrl) { navigate('/capture', { replace: true }); return }
    const started = Date.now()
    const ticker = window.setInterval(() => setStage((value) => Math.min(4, value + 1)), 390)
    removeBackground(sourceUrl, { tolerance: 35, feather: 2 }).then(async (canvas) => {
      const minimumDelay = Math.max(0, 1900 - (Date.now() - started))
      await new Promise((resolve) => window.setTimeout(resolve, minimumDelay))
      const blob = await canvasToBlob(canvas)
      const processedUrl = URL.createObjectURL(blob)
      window.clearInterval(ticker); setStage(5); setDone(true)
      window.setTimeout(() => navigate('/editor', { replace: true, state: { sourceUrl, processedUrl } }), 620)
    }).catch((reason: Error) => { window.clearInterval(ticker); setError(reason.message) })
    return () => window.clearInterval(ticker)
  }, [navigate, sourceUrl])
  if (!sourceUrl) return null
  return <main className="scan-page">
    <div className="scan-image-wrap">
      <img src={sourceUrl} alt="분석할 사진" />
      <div className={`scan-line ${done ? 'scan-line--done' : ''}`}><ScanLine /></div>
      <i className="focus-corner focus-corner--a" /><i className="focus-corner focus-corner--b" /><i className="focus-corner focus-corner--c" /><i className="focus-corner focus-corner--d" />
      <div className="scan-dots"><i /><i /><i /><i /><i /><i /></div>
    </div>
    <section className="scan-status">
      <span className={done ? 'scan-status__icon scan-status__icon--done' : 'scan-status__icon'}>{done ? <Check /> : <Sparkles />}</span>
      <div><small>STICKERSHOT AI</small><h1>{error || (done ? 'StickerShot 완료!' : stages[stage])}</h1><p>{error ? '다른 사진으로 다시 시도해 주세요.' : '사진 속 물건을 스티커로 바꾸고 있어요.'}</p></div>
      {!error && <div className="scan-progress"><span style={{ width: `${Math.min(100, (stage + 1) * 19)}%` }} /></div>}
      {error && <button className="btn btn--primary" onClick={() => navigate('/capture', { replace: true })}>다시 촬영하기</button>}
    </section>
  </main>
}
