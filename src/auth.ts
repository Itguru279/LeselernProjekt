import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.ts';

// Bilder für den Kinder-Login: Das Kind tippt seine drei Tiere in der
// richtigen Reihenfolge an. Es muss dafür weder lesen noch schreiben können.
export const PICTURES: { id: string; emoji: string; name: string }[] = [
  { id: 'hund', emoji: '🐶', name: 'Hund' },
  { id: 'katze', emoji: '🐱', name: 'Katze' },
  { id: 'maus', emoji: '🐭', name: 'Maus' },
  { id: 'frosch', emoji: '🐸', name: 'Frosch' },
  { id: 'fuchs', emoji: '🦊', name: 'Fuchs' },
  { id: 'baer', emoji: '🐻', name: 'Bär' },
  { id: 'hase', emoji: '🐰', name: 'Hase' },
  { id: 'loewe', emoji: '🦁', name: 'Löwe' },
  { id: 'pinguin', emoji: '🐧', name: 'Pinguin' },
];

export const PICTURE_IDS = new Set(PICTURES.map((p) => p.id));
export const CODE_LENGTH = 3;

export function normalizeCode(code: string): string | null {
  const parts = code
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length !== CODE_LENGTH || !parts.every((p) => PICTURE_IDS.has(p))) return null;
  return parts.join(',');
}

export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifySecret(secret: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(secret, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface SessionUser {
  id: number;
  name: string;
  role: 'child' | 'admin';
  avatar: string;
}

const DAY = 24 * 60 * 60 * 1000;

export function createSession(db: Db, userId: number, role: 'child' | 'admin'): { token: string; maxAgeSeconds: number } {
  const token = randomBytes(32).toString('base64url');
  // Kinder bleiben lange angemeldet (Tablet), Erwachsene 30 Tage.
  const ttl = role === 'child' ? 365 * DAY : 30 * DAY;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha256(token),
    userId,
    Date.now() + ttl,
  );
  return { token, maxAgeSeconds: Math.floor(ttl / 1000) };
}

export function userForToken(db: Db, token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.role, u.avatar, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as (SessionUser & { expires_at: number }) | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    return null;
  }
  return { id: row.id, name: row.name, role: row.role, avatar: row.avatar };
}

export function deleteSession(db: Db, token: string | undefined): void {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

// Einfache Bremse gegen Durchprobieren: nach 5 Fehlversuchen 60 Sekunden Pause.
const attempts = new Map<string, { count: number; until: number }>();

export function isLocked(key: string): number {
  const a = attempts.get(key);
  if (!a) return 0;
  const left = a.until - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

export function registerFailure(key: string): void {
  const a = attempts.get(key) ?? { count: 0, until: 0 };
  a.count += 1;
  if (a.count >= 5) {
    a.until = Date.now() + 60_000;
    a.count = 0;
  }
  attempts.set(key, a);
}

export function registerSuccess(key: string): void {
  attempts.delete(key);
}
