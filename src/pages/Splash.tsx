import { Camera } from 'lucide-react'
import { Logo } from '../components/Logo'

export function Splash() {
  return <main className="splash">
    <div className="splash__burst" />
    <div className="splash__camera"><Camera size={74} strokeWidth={2.7} /><span /></div>
    <Logo />
    <p>찍고, 모으고, 베어봐!</p>
    <div className="splash__peel">★</div>
  </main>
}
