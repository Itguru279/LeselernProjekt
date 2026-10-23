// Anwendungslogik: Nutzer anlegen, Tagesaufgaben erzeugen, Ergebnisse speichern.

import { randomBytes } from 'node:crypto';
import type { Config } from './config.ts';
import type { Db } from './db.ts';
import { hashSecret, normalizeCode } from './auth.ts';
import { generateDailySet, clampTaskCount, type Task } from './generator/daily.ts';
import { GRAPHEME_IDS } from './generator/graphemes.ts';

export interface ChildSettings {
  userId: number;
  graphemes: string[];
  tasksPerDay: number;
  syllableArcs: boolean;
}

export interface StoredSet {
  id: number;
  userId: number;
  date: string;
  version: number;
  graphemes: string[];
  letters: string[];
  tasks: Task[];
  createdAt: string;
  completedAt: string | null;
}

export const STICKERS = ['🌟', '🦄', '🚀', '🐢', '🌈', '🍀', '🐙', '🦋', '🏆', '🎈', '🐳', '🦖', '🍓', '⚡', '🎵', '🐝', '🌻', '🦜', '🍩', '🧸'];

export function bootstrap(db: Db, config: Config): void {
  // Admin anlegen
  const admin = db.prepare("SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1").get() as
    | { id: number; password_hash: string | null }
    | undefined;
  const reset = process.env.RESET_ADMIN_PASSWORD === 'true';
  if (!admin || !admin.password_hash || reset) {
    let password = config.adminPassword;
    if (!password) {
      password = randomBytes(9).toString('base64url');
      console.log('================================================================');
      console.log(` Kein ADMIN_PASSWORD gesetzt. Erzeugtes Admin-Passwort: ${password}`);
      console.log(' Bitte notieren und nach dem ersten Login ändern.');
      console.log('================================================================');
    }
    if (admin) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashSecret(password), admin.id);
    } else {
      db.prepare("INSERT INTO users (name, role, avatar, password_hash) VALUES (?, 'admin', '🔑', ?)").run(
        config.adminName,
        hashSecret(password),
      );
    }
    if (reset) console.log('Admin-Passwort wurde zurückgesetzt (RESET_ADMIN_PASSWORD=true).');
  }

  // Kind anlegen
  const child = db.prepare("SELECT id FROM users WHERE role = 'child' LIMIT 1").get() as { id: number } | undefined;
  if (!child) {
    const code = normalizeCode(config.childCode) ?? 'hund,katze,frosch';
    const info = db
      .prepare("INSERT INTO users (name, role, avatar, picture_code_hash) VALUES (?, 'child', '🦁', ?)")
      .run(config.childName, hashSecret(code));
    const letters = config.startLetters.filter((g) => GRAPHEME_IDS.has(g));
    db.prepare('INSERT INTO child_settings (user_id, graphemes) VALUES (?, ?)').run(
      Number(info.lastInsertRowid),
      JSON.stringify(letters),
    );
  }
}

export function children(db: Db): { id: number; name: string; avatar: string }[] {
  return db.prepare("SELECT id, name, avatar FROM users WHERE role = 'child' ORDER BY id").all() as {
    id: number;
    name: string;
    avatar: string;
  }[];
}

export function getSettings(db: Db, userId: number): ChildSettings {
  const row = db.prepare('SELECT * FROM child_settings WHERE user_id = ?').get(userId) as
    | { user_id: number; graphemes: string; tasks_per_day: number; syllable_arcs: number }
    | undefined;
  if (!row) {
    db.prepare('INSERT INTO child_settings (user_id) VALUES (?)').run(userId);
    return { userId, graphemes: [], tasksPerDay: 7, syllableArcs: true };
  }
  return {
    userId,
    graphemes: JSON.parse(row.graphemes),
    tasksPerDay: row.tasks_per_day,
    syllableArcs: row.syllable_arcs === 1,
  };
}

export function setGraphemes(db: Db, userId: number, graphemes: string[]): void {
  const clean = [...new Set(graphemes.filter((g) => GRAPHEME_IDS.has(g)))];
  db.prepare('UPDATE child_settings SET graphemes = ? WHERE user_id = ?').run(JSON.stringify(clean), userId);
}

export function setTasksPerDay(db: Db, userId: number, n: number): void {
  db.prepare('UPDATE child_settings SET tasks_per_day = ? WHERE user_id = ?').run(clampTaskCount(n), userId);
}

export function setSyllableArcs(db: Db, userId: number, on: boolean): void {
  db.prepare('UPDATE child_settings SET syllable_arcs = ? WHERE user_id = ?').run(on ? 1 : 0, userId);
}

export function todayIn(timeZone: string, now = new Date()): string {
  // en-CA liefert das Format YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function rowToSet(row: Record<string, unknown>): StoredSet {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    date: row.date as string,
    version: row.version as number,
    graphemes: JSON.parse(row.graphemes as string),
    letters: JSON.parse(row.letters as string),
    tasks: JSON.parse(row.tasks as string),
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export function getSet(db: Db, id: number): StoredSet | null {
  const row = db.prepare('SELECT * FROM daily_sets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToSet(row) : null;
}

export function listSets(db: Db, userId: number): StoredSet[] {
  return (
    db.prepare('SELECT * FROM daily_sets WHERE user_id = ? ORDER BY date DESC, version DESC').all(userId) as Record<
      string,
      unknown
    >[]
  ).map(rowToSet);
}

function storyProgress(db: Db, userId: number): Record<string, number> {
  const rows = db.prepare('SELECT series, episode_done FROM story_progress WHERE user_id = ?').all(userId) as {
    series: string;
    episode_done: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.series, r.episode_done]));
}

function recentWords(db: Db, userId: number): string[] {
  const rows = db
    .prepare('SELECT tasks FROM daily_sets WHERE user_id = ? ORDER BY date DESC, version DESC LIMIT 3')
    .all(userId) as { tasks: string }[];
  const words: string[] = [];
  for (const r of rows) {
    for (const t of JSON.parse(r.tasks) as Task[]) {
      if (t.type === 'wort-bild' || t.type === 'blitz') words.push(t.word);
      if (t.type === 'wortkette') words.push(...t.words);
      if (t.type === 'bild-wort') words.push(...t.options.filter((o) => o.correct).map((o) => o.word));
    }
  }
  return words;
}

/** Holt die heutigen Aufgaben oder erzeugt sie beim ersten Aufruf des Tages. */
export function getOrCreateToday(db: Db, userId: number, date: string): StoredSet {
  const row = db
    .prepare('SELECT * FROM daily_sets WHERE user_id = ? AND date = ? ORDER BY version DESC LIMIT 1')
    .get(userId, date) as Record<string, unknown> | undefined;
  if (row) return rowToSet(row);
  return createSet(db, userId, date, 0);
}

/** Erzeugt für heute eine neue Version (z. B. nach neuen Buchstaben). */
export function regenerateToday(db: Db, userId: number, date: string): StoredSet {
  const row = db
    .prepare('SELECT MAX(version) AS v FROM daily_sets WHERE user_id = ? AND date = ?')
    .get(userId, date) as { v: number | null };
  return createSet(db, userId, date, (row.v ?? -1) + 1);
}

function createSet(db: Db, userId: number, date: string, version: number): StoredSet {
  const settings = getSettings(db, userId);
  const set = generateDailySet({
    userId,
    date,
    version,
    known: settings.graphemes,
    taskCount: settings.tasksPerDay,
    storyProgress: storyProgress(db, userId),
    recentWords: recentWords(db, userId),
  });
  const info = db
    .prepare('INSERT INTO daily_sets (user_id, date, version, graphemes, letters, tasks) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, date, version, JSON.stringify(settings.graphemes), JSON.stringify(set.letters), JSON.stringify(set.tasks));
  return getSet(db, Number(info.lastInsertRowid)) as StoredSet;
}

export function doneIndices(db: Db, setId: number): number[] {
  const rows = db.prepare('SELECT DISTINCT task_index FROM results WHERE set_id = ?').all(setId) as {
    task_index: number;
  }[];
  return rows.map((r) => r.task_index);
}

export interface ResultInput {
  setId: number;
  taskIndex: number;
  ok: boolean;
  helpCount: number;
  detail?: { series?: string; number?: number };
}

/** Speichert ein Ergebnis. Gibt einen neuen Sticker zurück, wenn der Tag geschafft ist. */
export function recordResult(db: Db, userId: number, input: ResultInput): { sticker: string | null } {
  const set = getSet(db, input.setId);
  if (!set || set.userId !== userId) throw new Error('Aufgabe nicht gefunden');
  const task = set.tasks[input.taskIndex];
  if (!task) throw new Error('Aufgabe nicht gefunden');

  db.prepare('INSERT INTO results (set_id, task_index, ok, help_count, detail) VALUES (?, ?, ?, ?, ?)').run(
    set.id,
    input.taskIndex,
    input.ok ? 1 : 0,
    Math.max(0, Math.min(99, Math.round(input.helpCount))),
    input.detail ? JSON.stringify(input.detail) : null,
  );

  // Geschichte gelesen: Fortschritt der Serie merken, aber nur bei den
  // neuesten Aufgaben (Wiederholungen aus dem Archiv ändern nichts).
  const latest = db.prepare('SELECT MAX(date) AS d FROM daily_sets WHERE user_id = ?').get(userId) as { d: string };
  if (task.type === 'geschichte' && set.date === latest.d && input.detail?.series && input.detail.number) {
    const chosen = task.choices.find((c) => c.series === input.detail?.series && c.number === input.detail?.number);
    if (chosen) {
      db.prepare(
        `INSERT INTO story_progress (user_id, series, episode_done) VALUES (?, ?, ?)
         ON CONFLICT (user_id, series) DO UPDATE SET episode_done = excluded.episode_done`,
      ).run(userId, chosen.series, chosen.number);
    }
  }

  const done = doneIndices(db, set.id);
  if (!set.completedAt && done.length >= set.tasks.length) {
    db.prepare("UPDATE daily_sets SET completed_at = datetime('now') WHERE id = ?").run(set.id);
    const count = (db.prepare('SELECT COUNT(*) AS c FROM stickers WHERE user_id = ?').get(userId) as { c: number }).c;
    const emoji = STICKERS[count % STICKERS.length];
    db.prepare('INSERT OR IGNORE INTO stickers (user_id, set_id, emoji) VALUES (?, ?, ?)').run(userId, set.id, emoji);
    return { sticker: emoji };
  }
  return { sticker: null };
}

export function stickersOf(db: Db, userId: number): { emoji: string; created_at: string }[] {
  return db.prepare('SELECT emoji, created_at FROM stickers WHERE user_id = ? ORDER BY id').all(userId) as {
    emoji: string;
    created_at: string;
  }[];
}

/** Wörter, bei denen das Kind zuletzt Hilfe brauchte (für die Elternansicht). */
export function helpStats(db: Db, userId: number): { total: number; withHelp: number; days: number } {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN r.help_count > 0 OR r.ok = 0 THEN 1 ELSE 0 END) AS withHelp,
              COUNT(DISTINCT d.date) AS days
       FROM results r JOIN daily_sets d ON d.id = r.set_id WHERE d.user_id = ?`,
    )
    .get(userId) as { total: number; withHelp: number | null; days: number };
  return { total: row.total, withHelp: row.withHelp ?? 0, days: row.days };
}
