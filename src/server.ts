// Einstiegspunkt: kleiner HTTP-Server ohne externe Abhängigkeiten.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.ts';
import { openDb, type Db } from './db.ts';
import {
  createSession,
  deleteSession,
  hashSecret,
  isLocked,
  normalizeCode,
  registerFailure,
  registerSuccess,
  userForToken,
  verifySecret,
  type SessionUser,
} from './auth.ts';
import {
  bootstrap,
  children,
  doneIndices,
  getOrCreateToday,
  getSet,
  getSettings,
  helpStats,
  listSets,
  recordResult,
  regenerateToday,
  setGraphemes,
  setSyllableArcs,
  setTasksPerDay,
  stickersOf,
  todayIn,
} from './app.ts';
import * as V from './views.ts';
import { dropPrivileges } from './privileges.ts';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC_DIR = join(ROOT, 'public');

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  user: SessionUser | null;
  token: string | undefined;
}

export function createApp(db: Db, config = loadConfig()) {
  const secureCookie = (req: IncomingMessage) =>
    process.env.COOKIE_SECURE === 'true' || req.headers['x-forwarded-proto'] === 'https';

  function send(res: ServerResponse, status: number, body: string, type = 'text/html; charset=utf-8', extra: Record<string, string> = {}) {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...extra });
    res.end(body);
  }

  function redirect(res: ServerResponse, location: string, extra: Record<string, string | string[]> = {}) {
    res.writeHead(303, { Location: location, ...SECURITY_HEADERS, ...extra });
    res.end();
  }

  function json(res: ServerResponse, status: number, data: unknown) {
    send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
  }

  function cookies(req: IncomingMessage): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of (req.headers.cookie ?? '').split(';')) {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
  }

  function sessionCookie(req: IncomingMessage, token: string, maxAge: number): string {
    return `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie(req) ? '; Secure' : ''}`;
  }

  async function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<string> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += (chunk as Buffer).length;
      if (size > limit) throw new Error('Anfrage zu groß');
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  async function form(req: IncomingMessage): Promise<URLSearchParams> {
    return new URLSearchParams(await readBody(req));
  }

  function clientKey(req: IncomingMessage, who: string): string {
    const ip = (req.headers['cf-connecting-ip'] as string) ?? req.socket.remoteAddress ?? '?';
    return `${who}|${ip}`;
  }

  /** Das Kind, um das es geht: für Kinder sie selbst, für den Admin das erste Kind. */
  function childFor(user: SessionUser): { id: number; name: string; avatar: string } {
    if (user.role === 'child') return { id: user.id, name: user.name, avatar: user.avatar };
    return children(db)[0];
  }

  // Kurze Hinweise nach Formularen (über die URL, damit nichts gespeichert werden muss)
  const FLASH: Record<string, string> = {
    gespeichert: 'Gespeichert.',
    neu: 'Die heutigen Aufgaben wurden neu erzeugt.',
    code: 'Der Bilder-Code wurde geändert.',
    passwort: 'Das Passwort wurde geändert.',
    buchstaben: 'Buchstaben gespeichert. Die heutigen Aufgaben wurden neu erzeugt.',
  };
  const ERRORS: Record<string, string> = {
    code: 'Bitte drei Tiere auswählen.',
    passwort: 'Das aktuelle Passwort stimmt nicht oder das neue ist zu kurz.',
  };

  async function handle(ctx: Ctx): Promise<void> {
    const { req, res, url } = ctx;
    const path = url.pathname;
    const method = req.method ?? 'GET';

    // ----- öffentlich -----
    if (path === '/health') return send(res, 200, 'ok', 'text/plain');
    if (path.startsWith('/static/')) return serveStatic(res, path.slice('/static/'.length));

    if (path === '/login' && method === 'GET') {
      if (ctx.user) return redirect(res, '/menu');
      return send(res, 200, V.loginPage(children(db)));
    }

    const kidMatch = path.match(/^\/login\/kind\/(\d+)$/);
    if (kidMatch) {
      const kid = children(db).find((k) => k.id === Number(kidMatch[1]));
      if (!kid) return send(res, 404, V.notFoundPage(null));
      const key = clientKey(req, `kid${kid.id}`);
      if (method === 'GET') return send(res, 200, V.childCodePage(kid, null, isLocked(key)));
      if (method === 'POST') {
        const locked = isLocked(key);
        if (locked) return send(res, 429, V.childCodePage(kid, null, locked));
        const code = normalizeCode((await form(req)).get('code') ?? '');
        const row = db.prepare('SELECT picture_code_hash FROM users WHERE id = ?').get(kid.id) as { picture_code_hash: string };
        if (code && verifySecret(code, row.picture_code_hash)) {
          registerSuccess(key);
          const s = createSession(db, kid.id, 'child');
          return redirect(res, '/menu', { 'Set-Cookie': sessionCookie(req, s.token, s.maxAgeSeconds) });
        }
        registerFailure(key);
        return send(res, 401, V.childCodePage(kid, 'Das waren nicht die richtigen Tiere. Probier es noch einmal!', isLocked(key)));
      }
    }

    if (path === '/login/admin') {
      const key = clientKey(req, 'admin');
      if (method === 'GET') return send(res, 200, V.adminLoginPage(null, isLocked(key)));
      if (method === 'POST') {
        const locked = isLocked(key);
        if (locked) return send(res, 429, V.adminLoginPage(null, locked));
        const password = (await form(req)).get('password') ?? '';
        const admin = db.prepare("SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1").get() as {
          id: number;
          password_hash: string;
        };
        if (admin && verifySecret(password, admin.password_hash)) {
          registerSuccess(key);
          const s = createSession(db, admin.id, 'admin');
          return redirect(res, '/menu', { 'Set-Cookie': sessionCookie(req, s.token, s.maxAgeSeconds) });
        }
        registerFailure(key);
        return send(res, 401, V.adminLoginPage('Das Passwort stimmt nicht.', isLocked(key)));
      }
    }

    if (path === '/logout' && method === 'POST') {
      deleteSession(db, ctx.token);
      return redirect(res, '/login', { 'Set-Cookie': 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });
    }

    // ----- ab hier nur angemeldet -----
    const user = ctx.user;
    if (!user) {
      if (path.startsWith('/api/')) return json(res, 401, { error: 'nicht angemeldet' });
      return redirect(res, '/login');
    }
    const child = childFor(user);
    if (!child) return send(res, 500, 'Kein Kind angelegt');
    const today = todayIn(config.timeZone);

    if (path === '/' || path === '/menu') {
      const set = getOrCreateToday(db, child.id, today);
      const done = doneIndices(db, set.id).length;
      return send(res, 200, V.menuPage(user, child, { done, total: set.tasks.length }, stickersOf(db, child.id)));
    }

    if (path === '/heute' && method === 'GET') {
      const set = getOrCreateToday(db, child.id, today);
      return send(
        res,
        200,
        V.playerPage(user, set, doneIndices(db, set.id), getSettings(db, child.id), { title: 'Heute lesen', back: '/menu', isToday: true }),
      );
    }

    if (path === '/buchstaben') {
      if (method === 'POST') {
        if (user.role !== 'admin') return send(res, 403, V.notFoundPage(user));
        const chosen = (await form(req)).getAll('g');
        const before = getSettings(db, child.id).graphemes;
        // Reihenfolge erhalten: bisherige zuerst, neue hinten anhängen
        const next = [...before.filter((g) => chosen.includes(g)), ...chosen.filter((g) => !before.includes(g))];
        setGraphemes(db, child.id, next);
        regenerateToday(db, child.id, today);
        return redirect(res, '/buchstaben?ok=buchstaben');
      }
      const flash = FLASH[url.searchParams.get('ok') ?? ''] ?? null;
      return send(res, 200, V.lettersPage(user, getSettings(db, child.id), flash));
    }

    const letterMatch = path.match(/^\/buchstaben\/([^/]+)$/);
    if (letterMatch && method === 'GET') {
      return send(res, 200, V.letterDetailPage(user, decodeURIComponent(letterMatch[1]), getSettings(db, child.id)));
    }

    if (path === '/archiv') {
      return send(res, 200, V.archivePage(user, listSets(db, child.id), url.searchParams.get('b')));
    }

    const archiveMatch = path.match(/^\/archiv\/(\d+)$/);
    if (archiveMatch) {
      const set = getSet(db, Number(archiveMatch[1]));
      if (!set || set.userId !== child.id) return send(res, 404, V.notFoundPage(user));
      return send(
        res,
        200,
        V.playerPage(user, set, [], getSettings(db, child.id), { title: 'Noch einmal lesen', back: '/archiv', isToday: false }),
      );
    }

    if (path === '/api/result' && method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const out = recordResult(db, child.id, {
          setId: Number(body.setId),
          taskIndex: Number(body.taskIndex),
          ok: Boolean(body.ok),
          helpCount: Number(body.helpCount ?? 0),
          detail: body.detail && typeof body.detail === 'object' ? { series: String(body.detail.series ?? ''), number: Number(body.detail.number ?? 0) } : undefined,
        });
        return json(res, 200, out);
      } catch (e) {
        return json(res, 400, { error: (e as Error).message });
      }
    }

    // ----- nur Admin -----
    if (path.startsWith('/admin')) {
      if (user.role !== 'admin') return send(res, 403, V.notFoundPage(user));
      if (path === '/admin' && method === 'GET') {
        return send(
          res,
          200,
          V.adminPage(
            user,
            child,
            getSettings(db, child.id),
            helpStats(db, child.id),
            FLASH[url.searchParams.get('ok') ?? ''] ?? null,
            ERRORS[url.searchParams.get('fehler') ?? ''] ?? null,
          ),
        );
      }
      if (method === 'POST') {
        const f = await form(req);
        if (path === '/admin/einstellungen') {
          setTasksPerDay(db, child.id, Number(f.get('tasks')));
          setSyllableArcs(db, child.id, f.get('arcs') === 'on');
          return redirect(res, '/admin?ok=gespeichert');
        }
        if (path === '/admin/neu') {
          regenerateToday(db, child.id, today);
          return redirect(res, '/admin?ok=neu');
        }
        if (path === '/admin/code') {
          const code = normalizeCode([f.get('p1'), f.get('p2'), f.get('p3')].join(','));
          if (!code) return redirect(res, '/admin?fehler=code');
          db.prepare('UPDATE users SET picture_code_hash = ? WHERE id = ?').run(hashSecret(code), child.id);
          return redirect(res, '/admin?ok=code');
        }
        if (path === '/admin/passwort') {
          const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
          const next = f.get('next') ?? '';
          if (!verifySecret(f.get('current') ?? '', row.password_hash) || next.length < 8) {
            return redirect(res, '/admin?fehler=passwort');
          }
          db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashSecret(next), user.id);
          return redirect(res, '/admin?ok=passwort');
        }
      }
    }

    return send(res, 404, V.notFoundPage(user));
  }

  async function serveStatic(res: ServerResponse, rel: string) {
    const file = normalize(join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + '/')) return send(res, 404, 'Nicht gefunden', 'text/plain');
    try {
      const s = await stat(file);
      if (!s.isFile()) throw new Error('kein File');
      const body = await readFile(file);
      const type = MIME[extname(file)] ?? 'application/octet-stream';
      const cache = extname(file) === '.woff2' ? 'public, max-age=31536000, immutable' : 'public, max-age=300';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SECURITY_HEADERS });
      res.end(body);
    } catch {
      send(res, 404, 'Nicht gefunden', 'text/plain');
    }
  }

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = cookies(req).sid;
    try {
      await handle({ req, res, url, token, user: userForToken(db, token) });
    } catch (e) {
      console.error(e);
      if (!res.headersSent) send(res, 500, 'Da ist etwas schiefgegangen.', 'text/plain; charset=utf-8');
      else res.end();
    }
  });
}

// Direkt gestartet (nicht in Tests importiert)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  dropPrivileges(config.dataDir);
  const db = openDb(join(config.dataDir, 'leselern.db'));
  bootstrap(db, config);
  const server = createApp(db, config);
  server.listen(config.port, () => {
    console.log(`Leselern-App läuft auf Port ${config.port} (Daten: ${config.dataDir}, Zeitzone: ${config.timeZone})`);
  });
  const stop = () => {
    server.close();
    db.close();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
