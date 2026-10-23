import { chownSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Läuft der Prozess als root (Standard im Container), bekommt der
 * Datenordner den Unraid-Standardnutzer (PUID/PGID, meist 99:100) und der
 * Prozess gibt seine Root-Rechte ab.
 */
export function dropPrivileges(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) return;
  const uid = Number(process.env.PUID ?? 99);
  const gid = Number(process.env.PGID ?? 100);
  if (uid === 0) return; // ausdrücklich als root gewünscht
  const chownAll = (dir: string) => {
    chownSync(dir, uid, gid);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) chownAll(p);
      else chownSync(p, uid, gid);
    }
  };
  chownAll(dataDir);
  process.setgid!(gid);
  process.setuid!(uid);
}
