export const DB_NAME = 'stickershot-db'
export const DB_VERSION = 2
export const STICKER_STORE = 'stickers'
export const META_STORE = 'meta'

/**
 * IndexedDB upgrades are additive. Existing sticker blobs are never cleared: new
 * fields receive defaults lazily when records are read.
 */
export function migrateDatabase(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    const stickers = db.createObjectStore(STICKER_STORE, { keyPath: 'id' })
    stickers.createIndex('createdAt', 'createdAt')
    stickers.createIndex('lastUsedAt', 'lastUsedAt')
  }
  if (oldVersion < 2 && !db.objectStoreNames.contains(META_STORE)) {
    db.createObjectStore(META_STORE, { keyPath: 'key' })
  }
}
