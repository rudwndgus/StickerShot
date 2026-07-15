import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError(error) { console.error('서비스 워커 등록 실패', error) }
  })
  if (!needRefresh) return null
  return <aside className="update-toast" role="status">
    <div><strong>새로운 StickerShot이 준비됐어요.</strong><small>작업을 마친 뒤 업데이트해 주세요.</small></div>
    <div className="update-toast__actions">
      <button onClick={() => setNeedRefresh(false)}>나중에</button>
      <button className="primary" onClick={() => void updateServiceWorker(true)}>지금 업데이트</button>
    </div>
  </aside>
}
