import { ArrowLeft, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useStickers } from '../app/StickerContext'

export function AppHeader({ back = false, title, action }: { back?: boolean; title?: string; action?: React.ReactNode }) {
  const navigate = useNavigate()
  const { stickers } = useStickers()
  return <header className="app-header">
    <div className="app-header__side">
      {back ? <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로"><ArrowLeft /></button> : <Logo compact />}
    </div>
    {title && <h1 className="app-header__title">{title}</h1>}
    <div className="app-header__side app-header__side--right">
      {action ?? <>
        <span className="count-chip"><span>{stickers.length}</span>장</span>
        {!back && <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="설정"><Settings size={21} /></button>}
      </>}
    </div>
  </header>
}
