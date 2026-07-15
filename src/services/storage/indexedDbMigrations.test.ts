import { describe, expect, it, vi } from 'vitest'
import { migrateDatabase } from './indexedDbMigrations'

describe('IndexedDB migrations', () => {
  it('creates stores only on the relevant additive migration', () => {
    const indexes: string[] = []
    const store = { createIndex: (name: string) => indexes.push(name) }
    const names = { contains: () => false }
    const db = { objectStoreNames: names, createObjectStore: vi.fn(() => store) } as unknown as IDBDatabase
    migrateDatabase(db, 0)
    expect(db.createObjectStore).toHaveBeenCalledTimes(2)
    expect(indexes).toEqual(['createdAt', 'lastUsedAt'])
  })
  it('does not clear or recreate existing stores', () => {
    const db = { objectStoreNames: { contains: () => true }, createObjectStore: vi.fn() } as unknown as IDBDatabase
    migrateDatabase(db, 2)
    expect(db.createObjectStore).not.toHaveBeenCalled()
  })
})
