import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Splash } from '../pages/Splash'
import { Home } from '../pages/Home'
import { Capture } from '../pages/Capture'
import { Scan } from '../pages/Scan'
import { StickerEditor } from '../pages/StickerEditor'
import { StickerBin } from '../pages/StickerBin'
import { Game } from '../pages/Game'
import { SettingsPage } from '../pages/Settings'
import { UpdatePrompt } from '../components/UpdatePrompt'

export function App() {
  const [splash, setSplash] = useState(true)
  const location = useLocation()
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1450)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  if (splash) return <Splash />
  return <>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/capture" element={<Capture />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/editor" element={<StickerEditor />} />
      <Route path="/bin" element={<StickerBin />} />
      <Route path="/game" element={<Game />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <UpdatePrompt />
  </>
}
