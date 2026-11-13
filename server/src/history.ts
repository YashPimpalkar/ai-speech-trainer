import { randomUUID } from 'node:crypto'
import pg from 'pg'

export const KINDS = ['converse', 'improve', 'grammar', 'essay', 'email'] as const
export type Kind = (typeof KINDS)[number]

export interface HistoryItem {
  id: string
  kind: Kind
  title: string
  payload: unknown
  createdAt: string
  updatedAt: string
}

export interface HistoryStore {
  list(kind?: Kind, limit?: number): Promise<HistoryItem[]>
  get(id: string): Promise<HistoryItem | null>
  create(kind: Kind, title: string, payload: unknown): Promise<HistoryItem>
  update(id: string, patch: { title?: string; payload?: unknown }): Promise<HistoryItem | null>
  remove(id: string): Promise<boolean>
}

/** In-memory store: used by tests and as a fallback when DATABASE_URL isn't set. */
export function memoryStore(): HistoryStore {
  const items: HistoryItem[] = []
  return {
    async list(kind, limit = 100) {
      return items.filter((i) => !kind || i.kind === kind).slice().reverse().slice(0, limit)
    },
    async get(id) { return items.find((i) => i.id === id) ?? null },
    async create(kind, title, payload) {
      const now = new Date().toISOString()
      const item = { id: randomUUID(), kind, title, payload, createdAt: now, updatedAt: now }
      items.push(item)
      return item
    },
    async update(id, patch) {
      const item = items.find((i) => i.id === id)
      if (!item) return null
      if (patch.title !== undefined) item.title = patch.title
      if (patch.payload !== undefined) item.payload = patch.payload
      item.updatedAt = new Date().toISOString()
      return item
    },
    async remove(id) {
      const i = items.findIndex((x) => x.id === id)
      if (i < 0) return false
      items.splice(i, 1)
      return true
    },
  }
}

const row = (r: any): HistoryItem => ({
  id: r.id, kind: r.kind, title: r.title, payload: r.payload,
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
})

/** Postgres (Neon) store. Creates its table on first use. */
export async function pgStore(connectionString: string): Promise<HistoryStore> {
  // pg treats sslmode=require as verify-full; say so explicitly and drop channel_binding (unsupported by pg).
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  if (url.searchParams.get('sslmode') === 'require') url.searchParams.set('sslmode', 'verify-full')
  const pool = new pg.Pool({ connectionString: url.toString(), max: 5 })
  await pool.query(`
    create table if not exists history_items (
      id uuid primary key default gen_random_uuid(),
      kind text not null,
      title text not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists history_items_created_idx on history_items (created_at desc);
  `)
  return {
    async list(kind, limit = 100) {
      const r = kind
        ? await pool.query('select * from history_items where kind = $1 order by created_at desc limit $2', [kind, limit])
        : await pool.query('select * from history_items order by created_at desc limit $1', [limit])
      return r.rows.map(row)
    },
    async get(id) {
      const r = await pool.query('select * from history_items where id = $1', [id])
      return r.rows[0] ? row(r.rows[0]) : null
    },
    async create(kind, title, payload) {
      const r = await pool.query('insert into history_items (kind, title, payload) values ($1, $2, $3) returning *', [kind, title, JSON.stringify(payload ?? {})])
      return row(r.rows[0])
    },
    async update(id, patch) {
      const r = await pool.query(
        `update history_items set title = coalesce($2, title), payload = coalesce($3::jsonb, payload), updated_at = now() where id = $1 returning *`,
        [id, patch.title ?? null, patch.payload === undefined ? null : JSON.stringify(patch.payload)],
      )
      return r.rows[0] ? row(r.rows[0]) : null
    },
    async remove(id) {
      const r = await pool.query('delete from history_items where id = $1', [id])
      return (r.rowCount ?? 0) > 0
    },
  }
}
