// Einstiegspunkt: kleiner HTTP-Server ohne externe Abhängigkeiten.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
  setReadAloud,
  unlockLetter,
  setSyllableArcs,
  storyProgress,
  setTasksPerDay,
  stickersOf,
  todayIn,
} from './app.ts';
import * as V from './views.ts';
import { dropPrivileges } from './privileges.ts';
import { log, enabled } from './log.ts';
import { generateLesson, eligibleSeries } from './generator/daily.ts';
import { labelOf } from './generator/graphemes.ts';
import { renderEpisode } from './generator/story.ts';
import { SERIES } from './content/stories.ts';

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

  const ipOf = (req: IncomingMessage) => (req.headers['cf-connecting-ip'] as string) ?? req.socket.remoteAddress ?? '?';
  /** Wie das Login-Cookie gesetzt wird (hilft bei Problemen hinter Cloudflare). */
  const cookieInfo = (req: IncomingMessage) =>
    secureCookie(req) ? `secure (proto=${req.headers['x-forwarded-proto'] ?? '?'})` : `http (proto=${req.headers['x-forwarded-proto'] ?? 'keins'})`;

  /** Das Kind, um das es geht: für Kinder sie selbst, für den Admin das erste Kind. */
  function childFor(user: SessionUser): { id: number; name: string; avatar: string } {
    if (user.role === 'child') return { id: user.id, name: user.name, avatar: user.avatar };
    return children(db)[0];
  }

  /** Bücherregal: Kinder sehen gelesene Folgen passender Serien, Erwachsene alles. */
  function shelfItems(user: SessionUser, childId: number, known: string[]): V.ShelfItem[] {
    if (user.role === 'admin') {
      return SERIES.map((series) => ({ series, readable: series.episodes.map((e) => e.number) }));
    }
    const progress = storyProgress(db, childId);
    return eligibleSeries(known, progress)
      .sort((a, b) => a.i - b.i)
      .filter((x) => x.done > 0)
      .map(({ series, done }) => ({ series, readable: series.episodes.filter((e) => e.number <= done).map((e) => e.number) }));
  }

  // Kurze Hinweise nach Formularen (über die URL, damit nichts gespeichert werden muss)
  const FLASH: Record<string, string> = {
    gespeichert: 'Gespeichert.',
    neu: 'Die heutigen Aufgaben wurden neu erzeugt.',
    code: 'Der Bilder-Code wurde geändert.',
    passwort: 'Das Passwort wurde geändert.',
    buchstaben: 'Buchstaben gespeichert. Die heutigen Aufgaben wurden neu erzeugt.',
    vorlesen: 'Vorlese-Einstellung gespeichert.',
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
        if (locked) {
          log.warn('login', 'Kind-Anmeldung gesperrt (zu viele Fehlversuche)', { kind: kid.name, ip: ipOf(req), sekunden: locked });
          return send(res, 429, V.childCodePage(kid, null, locked));
        }
        const code = normalizeCode((await form(req)).get('code') ?? '');
        const row = db.prepare('SELECT picture_code_hash FROM users WHERE id = ?').get(kid.id) as { picture_code_hash: string };
        if (code && verifySecret(code, row.picture_code_hash)) {
          registerSuccess(key);
          log.info('login', 'Kind angemeldet', { kind: kid.name, ip: ipOf(req), cookie: cookieInfo(req) });
          const s = createSession(db, kid.id, 'child');
          return redirect(res, '/menu', { 'Set-Cookie': sessionCookie(req, s.token, s.maxAgeSeconds) });
        }
        registerFailure(key);
        log.warn('login', 'Kind-Anmeldung: falsche Tiere', { kind: kid.name, ip: ipOf(req), sperre: isLocked(key) || undefined });
        return send(res, 401, V.childCodePage(kid, 'Das waren nicht die richtigen Tiere. Probier es noch einmal!', isLocked(key)));
      }
    }

    if (path === '/login/admin') {
      const key = clientKey(req, 'admin');
      if (method === 'GET') return send(res, 200, V.adminLoginPage(null, isLocked(key)));
      if (method === 'POST') {
        const locked = isLocked(key);
        if (locked) {
          log.warn('login', 'Admin-Anmeldung gesperrt (zu viele Fehlversuche, kurz warten)', { ip: ipOf(req), sekunden: locked });
          return send(res, 429, V.adminLoginPage(null, locked));
        }
        const raw = (await form(req)).get('password') ?? '';
        const admin = db.prepare("SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1").get() as
          | { id: number; password_hash: string | null }
          | undefined;
        // Leerzeichen am Rand (Autokorrektur auf Tablets) nicht mitzählen
        const ok = !!admin && (verifySecret(raw, admin.password_hash) || (raw.trim() !== raw && verifySecret(raw.trim(), admin.password_hash)));
        if (admin && ok) {
          registerSuccess(key);
          log.info('login', 'Admin angemeldet', { ip: ipOf(req), cookie: cookieInfo(req) });
          const s = createSession(db, admin.id, 'admin');
          return redirect(res, '/menu', { 'Set-Cookie': sessionCookie(req, s.token, s.maxAgeSeconds) });
        }
        registerFailure(key);
        log.warn('login', 'Admin-Anmeldung: Passwort falsch', {
          ip: ipOf(req),
          eingegeben: `${raw.length} Zeichen`,
          grund: !admin ? 'kein Admin in der Datenbank' : !raw ? 'leeres Passwort' : undefined,
          sperre: isLocked(key) ? `${isLocked(key)} s` : undefined,
          tipp: 'ADMIN_PASSWORD ändern und Container neu starten setzt das Passwort neu',
        });
        return send(res, 401, V.adminLoginPage('Das Passwort stimmt nicht.', isLocked(key)));
      }
    }

    if (path === '/logout' && method === 'POST') {
      log.info('login', 'Abgemeldet', { wer: ctx.user?.name, ip: ipOf(req) });
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
      const done = new Set(doneIndices(db, set.id));
      const storyIndex = set.tasks.findIndex((t) => t.type === 'geschichte');
      const practice = set.tasks.map((t, i) => ({ t, i })).filter(({ t }) => t.type !== 'geschichte');
      const status: V.TodayStatus = {
        done: done.size,
        total: set.tasks.length,
        practiceDone: practice.filter(({ i }) => done.has(i)).length,
        practiceTotal: practice.length,
        hasStory: storyIndex >= 0,
        storyDone: storyIndex >= 0 && done.has(storyIndex),
      };
      const known = getSettings(db, child.id).graphemes;
      return send(res, 200, V.menuPage(user, child, status, stickersOf(db, child.id), known.at(-1) ?? null));
    }

    if (path === '/heute' && method === 'GET') {
      const set = getOrCreateToday(db, child.id, today);
      const settings = getSettings(db, child.id);
      const teil = url.searchParams.get('teil');
      const nur = url.searchParams.get('nur');
      const all = set.tasks.map((_, i) => i);
      let only: number[] | undefined;
      let back = '/menu';
      let title = 'Heute lesen';
      let skipStart = false;
      if (nur !== null && /^\d+$/.test(nur) && Number(nur) < set.tasks.length) {
        only = [Number(nur)];
        back = set.tasks[only[0]].type === 'geschichte' ? '/menu' : '/ueben';
        title = V.TASK_INFO[set.tasks[only[0]].type].title;
        skipStart = true;
      } else if (teil === 'ueben') {
        only = all.filter((i) => set.tasks[i].type !== 'geschichte');
        back = '/ueben';
        title = 'Üben';
      } else if (teil === 'geschichte') {
        only = all.filter((i) => set.tasks[i].type === 'geschichte');
        title = 'Geschichte';
        skipStart = true;
      }
      return send(
        res,
        200,
        V.playerPage(user, settings, {
          title,
          back,
          isToday: true,
          setId: set.id,
          tasks: set.tasks,
          done: doneIndices(db, set.id),
          only,
          skipStart,
          startTitle: title,
          startEmoji: teil === 'ueben' ? '🏋️' : '⭐',
        }),
      );
    }

    if (path === '/ueben' && method === 'GET') {
      const set = getOrCreateToday(db, child.id, today);
      return send(res, 200, V.practicePage(user, set, doneIndices(db, set.id)));
    }

    if (path === '/lernen' && method === 'GET') {
      return send(res, 200, V.learnPage(user, getSettings(db, child.id)));
    }

    const learnMatch = path.match(/^\/lernen\/([^/]+)$/);
    if (learnMatch && method === 'GET') {
      const id = decodeURIComponent(learnMatch[1]);
      const settings = getSettings(db, child.id);
      if (!settings.graphemes.includes(id)) return redirect(res, '/lernen');
      const round = Math.min(999, Math.max(0, Number(url.searchParams.get('runde')) || 0));
      const lesson = generateLesson({ userId: child.id, date: today, letter: id, known: settings.graphemes, round });
      return send(
        res,
        200,
        V.playerPage(user, settings, {
          title: `Lernen: ${labelOf(id)}`,
          back: '/lernen',
          isToday: false,
          setId: null,
          tasks: lesson.tasks,
          done: [],
          againUrl: `/lernen/${encodeURIComponent(id)}?runde=${round + 1}`,
          startTitle: `${labelOf(id)} lernen`,
          startEmoji: '🎓',
        }),
      );
    }

    const storyMatch = path.match(/^\/geschichte\/([a-z0-9-]+)\/(\d+)$/);
    if (storyMatch && method === 'GET') {
      const series = SERIES.find((x) => x.id === storyMatch[1]);
      const ep = series?.episodes.find((e) => e.number === Number(storyMatch[2]));
      const settings = getSettings(db, child.id);
      if (!series || !ep) return send(res, 404, V.notFoundPage(user));
      const readable = shelfItems(user, child.id, settings.graphemes).find((x) => x.series.id === series.id)?.readable ?? [];
      if (!readable.includes(ep.number)) return redirect(res, '/archiv');
      const rendered = renderEpisode(ep, series.title, new Set(settings.graphemes));
      return send(
        res,
        200,
        V.playerPage(user, settings, {
          title: ep.title,
          back: '/archiv',
          isToday: false,
          setId: null,
          tasks: [{ type: 'geschichte', choices: [rendered] }],
          done: [],
          skipStart: true,
        }),
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
        log.info('buchstaben', 'Buchstaben vom Admin gespeichert', { buchstaben: next.join(',') });
        return redirect(res, '/buchstaben?ok=buchstaben');
      }
      const flash = FLASH[url.searchParams.get('ok') ?? ''] ?? null;
      return send(res, 200, V.lettersPage(user, getSettings(db, child.id), flash));
    }

    // Buchstaben freischalten: dürfen Kind und Admin (entfernen nur der Admin)
    const unlockMatch = path.match(/^\/buchstaben\/([^/]+)\/freischalten$/);
    if (unlockMatch && method === 'POST') {
      const id = decodeURIComponent(unlockMatch[1]);
      const r = unlockLetter(db, child.id, id, today);
      log.info('buchstaben', r.added ? 'Buchstabe freigeschaltet' : 'Buchstabe war schon frei', {
        buchstabe: id,
        von: user.name,
        heuteNeu: r.regenerated ? 'ja' : 'nein (heute schon geübt, neue Aufgaben ab morgen)',
      });
      return redirect(res, r.added ? `/lernen/${encodeURIComponent(id)}` : '/buchstaben');
    }

    const letterMatch = path.match(/^\/buchstaben\/([^/]+)$/);
    if (letterMatch && method === 'GET') {
      return send(res, 200, V.letterDetailPage(user, decodeURIComponent(letterMatch[1]), getSettings(db, child.id)));
    }

    if (path === '/archiv') {
      const known = getSettings(db, child.id).graphemes;
      return send(res, 200, V.archivePage(user, listSets(db, child.id), url.searchParams.get('b'), shelfItems(user, child.id, known)));
    }

    const archiveMatch = path.match(/^\/archiv\/(\d+)$/);
    if (archiveMatch) {
      const set = getSet(db, Number(archiveMatch[1]));
      if (!set || set.userId !== child.id) return send(res, 404, V.notFoundPage(user));
      return send(
        res,
        200,
        V.playerPage(user, getSettings(db, child.id), {
          title: 'Noch einmal lesen',
          back: '/archiv',
          isToday: false,
          setId: set.id,
          tasks: set.tasks,
          done: [],
          startEmoji: '📚',
        }),
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
        log.debug('lesen', 'Ergebnis gespeichert', { aufgabe: body.taskIndex, richtig: Boolean(body.ok), hilfe: body.helpCount });
        if (out.sticker) log.info('lesen', 'Tag geschafft, Sticker vergeben', { kind: child.name, sticker: out.sticker });
        return json(res, 200, out);
      } catch (e) {
        log.warn('lesen', 'Ergebnis nicht gespeichert', { fehler: (e as Error).message });
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
          log.info('admin', 'Einstellungen gespeichert', { aufgaben: f.get('tasks'), silbenboegen: f.get('arcs') === 'on' });
          return redirect(res, '/admin?ok=gespeichert');
        }
        if (path === '/admin/vorlesen') {
          setReadAloud(db, child.id, f.get('mode') ?? 'an', f.get('adult') === 'on');
          log.info('admin', 'Vorlesen gespeichert', { modus: f.get('mode'), grauerText: f.get('adult') === 'on' });
          return redirect(res, '/admin?ok=vorlesen');
        }
        if (path === '/admin/neu') {
          regenerateToday(db, child.id, today);
          log.info('admin', 'Heutige Aufgaben neu erzeugt');
          return redirect(res, '/admin?ok=neu');
        }
        if (path === '/admin/code') {
          const code = normalizeCode([f.get('p1'), f.get('p2'), f.get('p3')].join(','));
          if (!code) return redirect(res, '/admin?fehler=code');
          db.prepare('UPDATE users SET picture_code_hash = ? WHERE id = ?').run(hashSecret(code), child.id);
          log.info('admin', 'Bilder-Code geändert', { kind: child.name });
          return redirect(res, '/admin?ok=code');
        }
        if (path === '/admin/passwort') {
          const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
          const next = f.get('next') ?? '';
          if (!verifySecret(f.get('current') ?? '', row.password_hash) || next.length < 8) {
            log.warn('admin', 'Passwort nicht geändert (aktuelles falsch oder neues zu kurz)');
            return redirect(res, '/admin?fehler=passwort');
          }
          db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashSecret(next), user.id);
          log.info('admin', 'Admin-Passwort in den Einstellungen geändert');
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
    const started = Date.now();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = cookies(req).sid;
    let user: SessionUser | null = null;
    // Jede Anfrage ins Log (Dateien und Health-Check nur bei LOG_LEVEL=debug)
    res.on('finish', () => {
      const quietPath = url.pathname.startsWith('/static/') || url.pathname === '/health' || url.pathname.startsWith('/favicon');
      const level = res.statusCode >= 500 ? 'error' : quietPath ? 'debug' : 'info';
      if (!enabled(level)) return;
      log[level]('http', `${req.method} ${url.pathname}${url.search} -> ${res.statusCode}`, {
        ms: Date.now() - started,
        wer: user ? `${user.name} (${user.role === 'admin' ? 'Admin' : 'Kind'})` : token ? 'abgelaufene Sitzung' : 'nicht angemeldet',
        ip: ipOf(req),
        ziel: res.statusCode === 303 ? (res.getHeader('location') as string) : undefined,
      });
    });
    try {
      user = userForToken(db, token);
      await handle({ req, res, url, token, user });
    } catch (e) {
      log.error('http', `Fehler bei ${req.method} ${url.pathname}`, { fehler: (e as Error).message });
      console.error(e);
      if (!res.headersSent) send(res, 500, 'Da ist etwas schiefgegangen.', 'text/plain; charset=utf-8');
      else res.end();
    }
  });
}

// Direkt gestartet (nicht in Tests importiert)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  process.on('uncaughtException', (e) => {
    log.error('app', 'Unerwarteter Fehler', { fehler: e.message });
    console.error(e);
  });
  process.on('unhandledRejection', (e) => log.error('app', 'Unerwarteter Fehler (Promise)', { fehler: String(e) }));
  log.info('start', 'Leselern-App startet', {
    version: process.env.APP_VERSION ?? 'dev',
    node: process.version,
    port: config.port,
    daten: config.dataDir,
    zeitzone: config.timeZone,
    logLevel: process.env.LOG_LEVEL ?? 'info',
    adminPasswortGesetzt: config.adminPassword ? 'ja' : 'nein',
    cookieSecure: process.env.COOKIE_SECURE === 'true' ? 'immer' : 'automatisch (bei HTTPS über Cloudflare)',
  });
  dropPrivileges(config.dataDir);
  log.info('start', 'Rechte', { uid: process.getuid?.(), gid: process.getgid?.() });
  const dbFile = join(config.dataDir, 'leselern.db');
  const existed = existsSync(dbFile);
  const db = openDb(dbFile);
  log.info('start', existed ? 'Datenbank gefunden' : 'Neue Datenbank angelegt (erster Start oder /data ist nicht dauerhaft eingebunden!)', { datei: dbFile });
  bootstrap(db, config);
  for (const kid of children(db)) {
    const st = getSettings(db, kid.id);
    log.info('start', 'Kind', { name: kid.name, buchstaben: st.graphemes.join(','), aufgabenProTag: st.tasksPerDay, vorlesen: st.readAloud });
  }
  const server = createApp(db, config);
  server.listen(config.port, () => {
    log.info('start', `Leselern-App läuft auf Port ${config.port}`, { heute: todayIn(config.timeZone) });
  });
  const stop = () => {
    log.info('start', 'Container wird beendet');
    server.close();
    db.close();
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
