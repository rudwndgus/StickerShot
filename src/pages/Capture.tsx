import { useEffect, useRef, useState } from 'react'
import { Camera as CameraIcon, Images, RefreshCw, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Toast } from '../components/Toast'

export function Capture() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [cameraReady, setCameraReady] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function openCamera() {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage('이 기기에서는 카메라를 바로 열 수 없어요. 사진 보관함에서 골라 주세요.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 2560 } }, audio: false })
        if (cancelled) return stream.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setCameraReady(true) }
      } catch {
        setCameraReady(false)
        setMessage('카메라를 사용할 수 없어요. 사진 보관함에서 선택해 주세요.')
      }
    }
    void openCamera()
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((track) => track.stop()) }
  }, [facingMode])

  const handleFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setMessage('JPG, PNG 같은 이미지 파일을 선택해 주세요.')
    navigate('/scan', { state: { sourceUrl: URL.createObjectURL(file) } })
  }

  const shoot = () => {
    const video = videoRef.current
    if (!video || !cameraReady) return fileRef.current?.click()
    const max = 1800; const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d')!
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => blob && navigate('/scan', { state: { sourceUrl: URL.createObjectURL(blob) } }), 'image/jpeg', .92)
  }

  return <main className="capture-page">
    <video ref={videoRef} className="camera-feed" playsInline muted />
    {!cameraReady && <div className="camera-fallback"><CameraIcon size={64} /><b>카메라를 준비하는 중</b><span>허용하지 않아도 보관함의 사진을 쓸 수 있어요.</span></div>}
    <button className="capture-close" onClick={() => navigate('/')} aria-label="닫기"><X /></button>
    <button className="capture-flip" onClick={() => setFacingMode((value) => value === 'environment' ? 'user' : 'environment')} aria-label="카메라 전환"><RefreshCw /></button>
    <div className="capture-guide"><span /><div><b>물건 하나만 프레임 안에 놓아주세요</b><small>단순한 배경에서 더 깔끔하게 만들어져요</small></div></div>
    <div className="capture-controls">
      <button className="gallery-btn" onClick={() => fileRef.current?.click()}><Images /><small>보관함</small></button>
      <button className="shutter" onClick={shoot} aria-label="촬영"><span /></button>
      <div className="gallery-btn gallery-btn--space" />
    </div>
    <input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
    <Toast message={message} />
  </main>
}
