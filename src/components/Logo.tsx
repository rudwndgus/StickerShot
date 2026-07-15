import { Camera } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="StickerShot">
    <span className="logo__mark"><Camera size={compact ? 16 : 21} strokeWidth={3} /></span>
    <span>Sticker<span>Shot</span></span>
  </div>
}
