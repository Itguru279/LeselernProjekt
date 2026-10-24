import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('child', 'admin')),
  avatar TEXT NOT NULL DEFAULT '🙂',
  picture_code_hash TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS child_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  graphemes TEXT NOT NULL DEFAULT '[]',
  tasks_per_day INTEGER NOT NULL DEFAULT 7,
  syllable_arcs INTEGER NOT NULL DEFAULT 1,
  read_aloud TEXT NOT NULL DEFAULT 'an',
  adult_tap INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS daily_sets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  graphemes TEXT NOT NULL,
  letters TEXT NOT NULL,
  tasks TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE (user_id, date, version)
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY,
  set_id INTEGER NOT NULL REFERENCES daily_sets(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  ok INTEGER NOT NULL,
  help_count INTEGER NOT NULL DEFAULT 0,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS story_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series TEXT NOT NULL,
  episode_done INTEGER NOT NULL,
  PRIMARY KEY (user_id, series)
);

CREATE TABLE IF NOT EXISTS stickers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  set_id INTEGER NOT NULL UNIQUE REFERENCES daily_sets(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Spalten, die nach der ersten Version dazugekommen sind. Bestehende Daten
// bleiben erhalten, es werden nur neue Spalten mit Standardwert angehängt.
const ADDED_COLUMNS: { table: string; column: string; definition: string }[] = [
  { table: 'child_settings', column: 'read_aloud', definition: "TEXT NOT NULL DEFAULT 'an'" },
  { table: 'child_settings', column: 'adult_tap', definition: 'INTEGER NOT NULL DEFAULT 1' },
];

function migrate(db: Db): void {
  for (const c of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${c.table})`).all() as { name: string }[];
    if (!cols.some((x) => x.name === c.column)) {
      db.exec(`ALTER TABLE ${c.table} ADD COLUMN ${c.column} ${c.definition}`);
    }
  }
}
