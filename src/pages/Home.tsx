import { Box, Camera, ChevronRight, Scissors, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { EmptySticker } from '../components/EmptySticker'
import { useStickers } from '../app/StickerContext'

export function Home() {
  const navigate = useNavigate()
  const { stickers, loading } = useStickers()
  return <main className="page page--home">
    <AppHeader />
    <section className="hero-card">
      <div className="hero-card__copy">
        <span className="eyebrow"><Sparkles size={14} /> 오늘의 한 장</span>
        <h1>평범한 물건도<br /><em>스티커</em>가 된다!</h1>
        <p>카메라로 찍으면 배경은 싹,<br />즐거움만 쏙 남겨드려요.</p>
        <button className="btn btn--ink" onClick={() => navigate('/capture')}><Camera /> 첫 스티커 만들기</button>
      </div>
      <div className="hero-card__art"><EmptySticker /><i className="doodle doodle--one">✦</i><i className="doodle doodle--two">↝</i></div>
    </section>

    <section className="action-grid" aria-label="주요 메뉴">
      <button className="action-card action-card--pink" onClick={() => navigate('/capture')}>
        <span className="action-card__icon"><Camera /></span><span><b>스티커 만들기</b><small>사진 한 장이면 완성</small></span><ChevronRight />
      </button>
      <button className="action-card action-card--mint" onClick={() => navigate('/bin')}>
        <span className="action-card__icon"><Box /></span><span><b>내 물건 보기</b><small>통통 튀는 스티커 통</small></span><ChevronRight />
      </button>
      <button className="action-card action-card--yellow" onClick={() => navigate('/game')}>
        <span className="action-card__icon"><Scissors /></span><span><b>게임 시작</b><small>한 번의 슥, NICE SHOT!</small></span><ChevronRight />
      </button>
    </section>

    <section className="recent-section">
      <div className="section-title"><div><span>MY COLLECTION</span><h2>최근 스티커</h2></div>{stickers.length > 0 && <button onClick={() => navigate('/bin')}>모두 보기</button>}</div>
      <div className="sticker-strip">
        {loading ? <div className="empty-strip">스티커 통을 여는 중…</div> : stickers.length ? stickers.slice(0, 6).map((sticker, i) => (
          <button className="sticker-card" key={sticker.id} onClick={() => navigate('/bin')} style={{ '--r': `${[-4, 3, -2, 5][i % 4]}deg` } as React.CSSProperties}>
            <img src={URL.createObjectURL(sticker.thumbnail)} alt={sticker.name} onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
            <span>{sticker.name}</span>
          </button>
        )) : <button className="empty-strip" onClick={() => navigate('/capture')}><span>＋</span><b>아직 스티커가 없어요</b><small>첫 번째 물건을 찍어볼까요?</small></button>}
      </div>
    </section>
  </main>
}
