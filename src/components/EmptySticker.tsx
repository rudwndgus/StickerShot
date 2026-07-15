export function EmptySticker({ mini = false }: { mini?: boolean }) {
  return <div className={`sample-sticker ${mini ? 'sample-sticker--mini' : ''}`}>
    <div className="sample-sticker__face">✦<span>◡</span>✦</div>
    <div className="sample-sticker__label">STICK ME!</div>
  </div>
}
