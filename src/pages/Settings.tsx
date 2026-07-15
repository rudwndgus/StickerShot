import { Bell, Database, HardDrive, Info, Smartphone, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { useStickers } from '../app/StickerContext'
import { getMeta, setMeta } from '../services/storage/stickerDb'

export function SettingsPage() {
  const { stickers, remove } = useStickers()
  const [sound, setSound] = useState(true)
  const [tips, setTips] = useState(true)
  useEffect(() => { void getMeta('settings', { sound: true, tips: true }).then((v) => { setSound(v.sound); setTips(v.tips) }) }, [])
  const save = (nextSound: boolean, nextTips: boolean) => void setMeta('settings', { sound: nextSound, tips: nextTips })
  const bytes = stickers.reduce((sum, sticker) => sum + sticker.storedBytes, 0)
  const format = bytes < 1024 * 1024 ? `${Math.max(0, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return <main className="page settings-page">
    <AppHeader back title="설정" action={<span />} />
    <section className="settings-hero"><span><Info /></span><div><small>StickerShot</small><h1>나만의 물건을<br />즐거움으로 바꾸는 곳</h1><p>Snap it. Sticker it. Slice it.</p></div></section>
    <section className="settings-group"><h2>플레이</h2>
      <label className="settings-row"><span><i><Volume2 /></i><span><b>효과음</b><small>촬영과 베기 소리를 재생해요</small></span></span><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); save(e.target.checked, tips) }} /></label>
      <label className="settings-row"><span><i><Bell /></i><span><b>도움말</b><small>처음 쓰는 기능을 안내해요</small></span></span><input type="checkbox" checked={tips} onChange={(e) => { setTips(e.target.checked); save(sound, e.target.checked) }} /></label>
    </section>
    <section className="settings-group"><h2>저장 공간</h2>
      <div className="settings-row"><span><i><Database /></i><span><b>내 스티커</b><small>{stickers.length}개 · {format} 사용 중</small></span></span><HardDrive /></div>
      <button className="settings-row settings-row--danger" onClick={() => { if (stickers.length && confirm(`저장된 스티커 ${stickers.length}개를 모두 삭제할까요?`)) void Promise.all(stickers.map((s) => remove(s.id))) }}><span><i><Trash2 /></i><span><b>모든 스티커 삭제</b><small>이 작업은 되돌릴 수 없어요</small></span></span></button>
    </section>
    <section className="settings-group"><h2>앱 정보</h2><div className="settings-row"><span><i><Smartphone /></i><span><b>현재 버전</b><small>쏟아지고 쌓이는 스티커 통</small></span></span><b>1.2.1</b></div></section>
    <footer className="settings-footer">STICKERSHOT · MADE FOR LITTLE JOYS<br /><span>찍고, 모으고, 베어봐!</span></footer>
  </main>
}
