import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Box, Camera, Pause, Play, RotateCcw, Scissors } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStickers } from '../app/StickerContext'
import { GameCanvas } from '../game/GameCanvas'
import type { Point, StickerRecord } from '../types'

export function Game() {
  const navigate = useNavigate(); const { stickers, update } = useStickers()
  const [phase, setPhase] = useState<'ready' | 'running' | 'paused' | 'over'>('ready')
  const [time, setTime] = useState(30); const [score, setScore] = useState(0); const [combo, setCombo] = useState(0); const [bestCombo, setBestCombo] = useState(0)
  const [pop, setPop] = useState<{ id: number; text: string; x: number; y: number } | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({}); const comboTimer = useRef(0)
  const persisted = useRef(false)
  useEffect(() => {
    if (phase !== 'running') return
    const timer = window.setInterval(() => setTime((value) => { if (value <= 1) { setPhase('over'); return 0 } return value - 1 }), 1000)
    return () => window.clearInterval(timer)
  }, [phase])
  useEffect(() => {
    if (phase !== 'over' || persisted.current) return
    persisted.current = true
    stickers.forEach((sticker) => {
      const cut = counts[sticker.name] || 0
      if (cut) void update(sticker.id, { slicedCount: sticker.slicedCount + cut, lastUsedAt: Date.now() })
    })
  }, [phase, counts, stickers, update])
  const slice = useCallback((sticker: StickerRecord, point: Point) => {
    const now = Date.now(); const nextCombo = now - comboTimer.current < 900 ? combo + 1 : 1; comboTimer.current = now
    setCombo(nextCombo); setBestCombo((value) => Math.max(value, nextCombo)); const points = 100 + Math.max(0, nextCombo - 1) * 25; setScore((value) => value + points)
    setCounts((value) => ({ ...value, [sticker.name]: (value[sticker.name] || 0) + 1 }))
    setPop({ id: now, text: nextCombo >= 3 ? `${nextCombo} COMBO!` : nextCombo === 2 ? 'NICE SHOT!' : 'SLICE!', x: point.x, y: point.y })
    window.setTimeout(() => setPop((value) => value?.id === now ? null : value), 650)
  }, [combo])
  const restart = () => { persisted.current = false; setTime(30); setScore(0); setCombo(0); setBestCombo(0); setCounts({}); setPhase('running') }
  const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '아직 없음'
  return <main className="game-page">
    <div className="game-bg"><i /><i /><i /></div>
    <header className="game-hud"><button onClick={() => navigate('/')}><ArrowLeft /></button><div className="score"><small>SCORE</small><b>{score.toLocaleString()}</b></div><div className="timer"><span style={{ '--time': `${time / 30 * 360}deg` } as React.CSSProperties}>{time}</span></div><button onClick={() => setPhase((value) => value === 'running' ? 'paused' : 'running')}>{phase === 'paused' ? <Play /> : <Pause />}</button></header>
    <GameCanvas stickers={stickers} running={phase === 'running'} onSlice={slice} />
    {pop && <div key={pop.id} className="score-pop" style={{ left: pop.x, top: pop.y }}><b>{pop.text}</b><span>+{100 + Math.max(0, combo - 1) * 25}</span></div>}
    <div className="blade-hint"><Scissors /> 손가락으로 빠르게 그어보세요!</div>
    {phase === 'ready' && <div className="game-overlay"><section className="game-card"><span className="game-card__icon"><Scissors /></span><small>STICKERSHOT</small><h1>준비됐나요?</h1><p>날아오는 스티커를 손가락으로<br />빠르게 슥— 베어보세요!</p><button className="btn btn--primary" onClick={restart}><Play /> 게임 시작</button>{!stickers.length && <em>내 스티커가 없어 기본 별콩이가 등장해요.</em>}</section></div>}
    {phase === 'paused' && <div className="game-overlay"><section className="game-card game-card--small"><Pause /><h1>잠시 멈춤</h1><button className="btn btn--primary" onClick={() => setPhase('running')}><Play /> 계속하기</button><button className="text-btn" onClick={() => navigate('/')}>홈으로</button></section></div>}
    {phase === 'over' && <div className="game-overlay"><section className="result-card"><small>GAME OVER</small><h1>NICE SHOT!</h1><div className="final-score"><span>최종 점수</span><b>{score.toLocaleString()}</b></div><div className="result-stats"><span><b>{bestCombo}</b><small>최고 콤보</small></span><span><b>{Object.values(counts).reduce((a, b) => a + b, 0)}</b><small>베어낸 스티커</small></span><span><b>{favorite}</b><small>최애 물건</small></span></div><button className="btn btn--primary" onClick={restart}><RotateCcw /> 다시 하기</button><div className="result-links"><button onClick={() => navigate('/bin')}><Box /> 내 물건 보기</button><button onClick={() => navigate('/capture')}><Camera /> 새로 만들기</button></div></section></div>}
  </main>
}
