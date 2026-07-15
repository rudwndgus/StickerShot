/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { StickerRecord } from '../types'
import { deleteSticker, getStickers, saveSticker, updateSticker } from '../services/storage/stickerDb'

interface StickerContextValue {
  stickers: StickerRecord[]
  loading: boolean
  refresh: () => Promise<void>
  add: (sticker: StickerRecord) => Promise<void>
  remove: (id: string) => Promise<void>
  update: (id: string, patch: Partial<StickerRecord>) => Promise<void>
}

const StickerContext = createContext<StickerContextValue | null>(null)

export function StickerProvider({ children }: { children: React.ReactNode }) {
  const [stickers, setStickers] = useState<StickerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try { setStickers(await getStickers()) } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const value = useMemo(() => ({
    stickers, loading, refresh,
    add: async (sticker: StickerRecord) => { await saveSticker(sticker); await refresh() },
    remove: async (id: string) => { await deleteSticker(id); await refresh() },
    update: async (id: string, patch: Partial<StickerRecord>) => { await updateSticker(id, patch); await refresh() }
  }), [stickers, loading, refresh])
  return <StickerContext.Provider value={value}>{children}</StickerContext.Provider>
}

export function useStickers() {
  const value = useContext(StickerContext)
  if (!value) throw new Error('StickerProvider is missing')
  return value
}
