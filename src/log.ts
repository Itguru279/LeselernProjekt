// Protokoll für das Docker-Log (Unraid: Docker → Container-Icon → Logs).
// Eine Zeile pro Ereignis: Zeit, Stufe, Bereich, Text und Details.
//
// LOG_LEVEL: debug (alles, auch Dateien und Health-Checks), info (Standard:
// Seitenaufrufe, Anmeldungen, Änderungen), warn, error.

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): Level {
  const v = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return (v in ORDER ? v : 'info') as Level;
}

let minLevel = configuredLevel();
let quiet = false;

/** Für Tests: Ausgabe abschalten. */
export function setQuiet(q: boolean): void {
  quiet = q;
}

export function setLevel(level: string): void {
  minLevel = (level in ORDER ? level : 'info') as Level;
}

export function enabled(level: Level): boolean {
  return ORDER[level] >= ORDER[minLevel];
}

function stamp(): string {
  // Ortszeit (TZ des Containers), gut lesbar: 2026-10-24 20:55:13
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function format(fields?: Record<string, unknown>): string {
  if (!fields) return '';
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return `${k}=${/\s/.test(s) ? JSON.stringify(s) : s}`;
    });
  return parts.length ? '  ' + parts.join(' ') : '';
}

function write(level: Level, area: string, msg: string, fields?: Record<string, unknown>): void {
  if (quiet || !enabled(level)) return;
  const line = `${stamp()} ${level.toUpperCase().padEnd(5)} [${area}] ${msg}${format(fields)}`;
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const log = {
  debug: (area: string, msg: string, fields?: Record<string, unknown>) => write('debug', area, msg, fields),
  info: (area: string, msg: string, fields?: Record<string, unknown>) => write('info', area, msg, fields),
  warn: (area: string, msg: string, fields?: Record<string, unknown>) => write('warn', area, msg, fields),
  error: (area: string, msg: string, fields?: Record<string, unknown>) => write('error', area, msg, fields),
};
