import type { StickerRecord } from '../../types'
import { DB_NAME, DB_VERSION, META_STORE, STICKER_STORE, migrateDatabase } from './indexedDbMigrations'

let openPromise: Promise<IDBDatabase> | undefined

export function openDatabase() {
  if (openPromise) return openPromise
  openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => migrateDatabase(request.result, (event as IDBVersionChangeEvent).oldVersion)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('다른 StickerShot 창을 닫고 다시 시도해 주세요.'))
  })
  return openPromise
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getStickers(): Promise<StickerRecord[]> {
  const db = await openDatabase()
  const records = await requestResult(db.transaction(STICKER_STORE, 'readonly').objectStore(STICKER_STORE).getAll())
  return records
    .map((item) => ({ gameEnabled: true, slicedCount: 0, lastUsedAt: item.createdAt, ...item }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function saveSticker(sticker: StickerRecord) {
  const db = await openDatabase()
  await requestResult(db.transaction(STICKER_STORE, 'readwrite').objectStore(STICKER_STORE).put(sticker))
}

export async function deleteSticker(id: string) {
  const db = await openDatabase()
  await requestResult(db.transaction(STICKER_STORE, 'readwrite').objectStore(STICKER_STORE).delete(id))
}

export async function updateSticker(id: string, patch: Partial<StickerRecord>) {
  const db = await openDatabase()
  const tx = db.transaction(STICKER_STORE, 'readwrite')
  const store = tx.objectStore(STICKER_STORE)
  const sticker = await requestResult<StickerRecord | undefined>(store.get(id))
  if (!sticker) return
  await requestResult(store.put({ ...sticker, ...patch }))
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await openDatabase()
  const row = await requestResult<{ key: string; value: T } | undefined>(
    db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(key)
  )
  return row?.value ?? fallback
}

export async function setMeta<T>(key: string, value: T) {
  const db = await openDatabase()
  await requestResult(db.transaction(META_STORE, 'readwrite').objectStore(META_STORE).put({ key, value }))
}
