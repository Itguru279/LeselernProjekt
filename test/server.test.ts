import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.ts';
import { getSettings } from '../src/app.ts';
import { bootstrap } from '../src/app.ts';
import { createApp } from '../src/server.ts';
import { loadConfig } from '../src/config.ts';

const config = loadConfig({ ADMIN_PASSWORD: 'testpasswort', CHILD_NAME: 'Ben', CHILD_CODE: 'hund,katze,frosch', START_LETTERS: 'a,m,l,o,i,e' });
const db = openDb(':memory:');
bootstrap(db, config);
const server = createApp(db, config);
let base = '';

before(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (path: string, body: Record<string, string>, cookie = '') =>
  fetch(base + path, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams(body),
  });

const sid = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0];

test('ohne Anmeldung geht es zum Login', async () => {
  const res = await fetch(base + '/menu', { redirect: 'manual' });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/login');
});

test('Ben meldet sich mit dem Bilder-Code an', async () => {
  const wrong = await post('/login/kind/2', { code: 'hund,maus,frosch' });
  assert.equal(wrong.status, 401);
  const ok = await post('/login/kind/2', { code: 'hund,katze,frosch' });
  assert.equal(ok.status, 303);
  const cookie = sid(ok);
  assert.match(cookie, /^sid=/);

  const menu = await fetch(base + '/menu', { headers: { cookie } });
  const html = await menu.text();
  assert.match(html, /Hallo Ben/);
  assert.doesNotMatch(html, /Einstellungen/);

  const heute = await (await fetch(base + '/heute', { headers: { cookie } })).text();
  const data = JSON.parse(heute.match(/<script type="application\/json" id="player-data">(.*?)<\/script>/s)![1]);
  assert.ok(data.tasks.length >= 5 && data.tasks.length <= 10);

  // Alle Aufgaben lösen -> Sticker
  let sticker = null;
  for (let i = 0; i < data.tasks.length; i++) {
    const t = data.tasks[i];
    const detail = t.type === 'geschichte' ? { series: t.choices[0].series, number: t.choices[0].number } : undefined;
    const r = await fetch(base + '/api/result', {
      method: 'POST',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId: data.setId, taskIndex: i, ok: true, helpCount: 0, detail }),
    });
    assert.equal(r.status, 200);
    sticker = (await r.json()).sticker ?? sticker;
  }
  assert.ok(sticker, 'Sticker erwartet');

  const archiv = await (await fetch(base + '/archiv', { headers: { cookie } })).text();
  assert.match(archiv, /Lola das Lama|Emil der Frosch/);
  assert.match(archiv, /class="lchip">Mm</);

  // Ben darf keine Buchstaben ändern
  const forbidden = await post('/buchstaben', { g: 'n' }, cookie);
  assert.equal(forbidden.status, 403);
});

test('Admin meldet sich mit Passwort an und ändert Buchstaben', async () => {
  const bad = await post('/login/admin', { password: 'falsch' });
  assert.equal(bad.status, 401);
  const ok = await post('/login/admin', { password: 'testpasswort' });
  assert.equal(ok.status, 303);
  const cookie = sid(ok);

  const res = await fetch(base + '/buchstaben', {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'g=a&g=m&g=l&g=o&g=i&g=e&g=n',
  });
  assert.equal(res.status, 303);
  const page = await (await fetch(base + '/buchstaben', { headers: { cookie } })).text();
  assert.match(page, /value="n" checked/);

  const admin = await (await fetch(base + '/admin', { headers: { cookie } })).text();
  assert.match(admin, /Einstellungen für Ben/);
});

const playerData = (html: string) =>
  JSON.parse(html.match(/<script type="application\/json" id="player-data">(.*?)<\/script>/s)![1]);

test('Lernen, Üben und Geschichte lassen sich getrennt öffnen', async () => {
  const cookie = sid(await post('/login/kind/2', { code: 'hund,katze,frosch' }));
  const menu = await (await fetch(base + '/menu', { headers: { cookie } })).text();
  for (const href of ['/heute', '/lernen', '/ueben', '/heute?teil=geschichte', '/archiv']) {
    assert.ok(menu.includes(`href="${href}"`), href);
  }

  const lernen = await (await fetch(base + '/lernen', { headers: { cookie } })).text();
  assert.match(lernen, /href="\/lernen\/m"/);
  assert.match(lernen, /class="btn-back"/);

  const lesson = playerData(await (await fetch(base + '/lernen/e', { headers: { cookie } })).text());
  assert.equal(lesson.setId, null);
  assert.equal(lesson.tasks[0].type, 'laut');
  assert.equal(lesson.backUrl, '/lernen');

  // Noch nicht freigeschaltet: zurück zur Übersicht
  const locked = await fetch(base + '/lernen/p', { headers: { cookie }, redirect: 'manual' });
  assert.equal(locked.status, 303);

  const ueben = await (await fetch(base + '/ueben', { headers: { cookie } })).text();
  assert.match(ueben, /href="\/heute\?nur=0"/);
  assert.match(ueben, /href="\/heute\?teil=ueben"/);

  const one = playerData(await (await fetch(base + '/heute?nur=0', { headers: { cookie } })).text());
  assert.deepEqual(one.only, [0]);
  assert.equal(one.skipStart, true);

  const story = playerData(await (await fetch(base + '/heute?teil=geschichte', { headers: { cookie } })).text());
  assert.equal(story.only.length, 1);
  assert.equal(story.tasks[story.only[0]].type, 'geschichte');

  const practice = playerData(await (await fetch(base + '/heute?teil=ueben', { headers: { cookie } })).text());
  assert.ok(practice.only.every((i: number) => practice.tasks[i].type !== 'geschichte'));
});

test('Vorlesen beim Antippen lässt sich im Admin-Bereich abschalten', async () => {
  const kid = sid(await post('/login/kind/2', { code: 'hund,katze,frosch' }));
  const forbidden = await post('/admin/vorlesen', { mode: 'aus' }, kid);
  assert.equal(forbidden.status, 403);

  const cookie = sid(await post('/login/admin', { password: 'testpasswort' }));
  const res = await post('/admin/vorlesen', { mode: 'aus' }, cookie);
  assert.equal(res.status, 303);
  assert.equal(getSettings(db, 2).readAloud, 'aus');
  assert.equal(getSettings(db, 2).adultTap, false);
  const data = playerData(await (await fetch(base + '/heute', { headers: { cookie: kid } })).text());
  assert.equal(data.readAloud, 'aus');

  await post('/admin/vorlesen', { mode: 'spaeter', adult: 'on' }, cookie);
  assert.equal(getSettings(db, 2).readAloud, 'spaeter');
  assert.equal(getSettings(db, 2).adultTap, true);
  await post('/admin/vorlesen', { mode: 'quatsch', adult: 'on' }, cookie);
  assert.equal(getSettings(db, 2).readAloud, 'an');
});

test('Bücherregal: Admin sieht alle Folgen, Ben nur gelesene', async () => {
  const admin = sid(await post('/login/admin', { password: 'testpasswort' }));
  const page = await (await fetch(base + '/archiv', { headers: { cookie: admin } })).text();
  assert.match(page, /Opa Pit, der Pirat/);
  const ep = await fetch(base + '/geschichte/pit/3', { headers: { cookie: admin } });
  assert.equal(ep.status, 200);

  const kid = sid(await post('/login/kind/2', { code: 'hund,katze,frosch' }));
  const blocked = await fetch(base + '/geschichte/pit/3', { headers: { cookie: kid }, redirect: 'manual' });
  assert.equal(blocked.status, 303);
});

test('alte Datenbank wird beim Start ergänzt, Daten bleiben erhalten', () => {
  const dir = mkdtempSync(join(tmpdir(), 'leselern-'));
  try {
    const file = join(dir, 'leselern.db');
    // Schema der ersten Version (ohne die neuen Spalten)
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, role TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🙂',
                picture_code_hash TEXT, password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
              CREATE TABLE child_settings (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                graphemes TEXT NOT NULL DEFAULT '[]', tasks_per_day INTEGER NOT NULL DEFAULT 7, syllable_arcs INTEGER NOT NULL DEFAULT 1);
              INSERT INTO users (id, name, role) VALUES (5, 'Ben', 'child');
              INSERT INTO child_settings (user_id, graphemes, tasks_per_day, syllable_arcs) VALUES (5, '["a","m","l"]', 9, 0);`);
    old.close();
    const fresh = openDb(file);
    const s = getSettings(fresh, 5);
    assert.deepEqual(s.graphemes, ['a', 'm', 'l']);
    assert.equal(s.tasksPerDay, 9);
    assert.equal(s.syllableArcs, false);
    assert.equal(s.readAloud, 'an');
    assert.equal(s.adultTap, true);
    fresh.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
