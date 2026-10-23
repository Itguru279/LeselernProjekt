// HTML-Seiten. Bewusst ohne Framework: einfache Funktionen, die Text erzeugen.

import type { SessionUser } from './auth.ts';
import { PICTURES } from './auth.ts';
import type { ChildSettings, StoredSet } from './app.ts';
import { GRAPHEMES, capitalOf, isDecodable, labelOf, segment } from './generator/graphemes.ts';
import { SIMPLE_CONSONANTS, VOWELS, MIN_TASKS, MAX_TASKS } from './generator/daily.ts';
import { WORDS } from './content/words.ts';

export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON sicher in ein <script>-Tag einbetten. */
function jsonScript(id: string, data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/json" id="${id}">${json}</script>`;
}

interface LayoutOptions {
  user?: SessionUser | null;
  back?: string; // Link für den Zurück-Knopf
  bodyClass?: string;
  scripts?: string[];
}

export function layout(title: string, body: string, opts: LayoutOptions = {}): string {
  const user = opts.user;
  const top = user
    ? `<header class="top">
        ${opts.back ? `<a class="btn-icon" href="${esc(opts.back)}" aria-label="Zurück">⬅️</a>` : '<span></span>'}
        <span class="who">${esc(user.avatar)} ${esc(user.name)}</span>
        <form method="post" action="/logout"><button class="btn-icon" aria-label="Abmelden" title="Abmelden">🚪</button></form>
      </header>`
    : '';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fff7e8">
<title>${esc(title)} · Lesen lernen</title>
<link rel="stylesheet" href="/static/app.css">
<link rel="manifest" href="/static/manifest.webmanifest">
<link rel="icon" href="/static/icon.svg" type="image/svg+xml">
</head>
<body class="${esc(opts.bodyClass ?? '')}">
${top}
<main>
${body}
</main>
${(opts.scripts ?? []).map((s) => `<script type="module" src="${esc(s)}"></script>`).join('\n')}
</body>
</html>`;
}

// ---------- Login ----------

export function loginPage(kids: { id: number; name: string; avatar: string }[]): string {
  const tiles = kids
    .map(
      (k) => `<a class="tile big" href="/login/kind/${k.id}">
        <span class="tile-emoji">${esc(k.avatar)}</span><span class="tile-label">${esc(k.name)}</span></a>`,
    )
    .join('');
  return layout(
    'Anmelden',
    `<h1 class="center">Wer liest heute?</h1>
     <div class="tiles">${tiles}
       <a class="tile big adult" href="/login/admin"><span class="tile-emoji">🔑</span><span class="tile-label">Erwachsene</span></a>
     </div>`,
    { bodyClass: 'login' },
  );
}

export function childCodePage(kid: { id: number; name: string; avatar: string }, error: string | null, lockedSeconds: number): string {
  const grid = PICTURES.map(
    (p) => `<button type="button" class="pic" data-id="${esc(p.id)}" aria-label="${esc(p.name)}">${esc(p.emoji)}</button>`,
  ).join('');
  return layout(
    'Anmelden',
    `<div class="center">
      <div class="avatar">${esc(kid.avatar)}</div>
      <h1>Hallo ${esc(kid.name)}!</h1>
      <p class="hint">Tippe deine drei Tiere.</p>
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      ${lockedSeconds ? `<p class="error" role="alert">Kurz warten … (${lockedSeconds} Sekunden)</p>` : ''}
      <div class="code-dots" aria-live="polite"><span></span><span></span><span></span></div>
      <form method="post" action="/login/kind/${kid.id}" id="code-form">
        <input type="hidden" name="code" id="code-input">
      </form>
      <div class="pic-grid">${grid}</div>
      <p><a class="link-quiet" href="/login">⬅️ zurück</a></p>
    </div>`,
    { bodyClass: 'login', scripts: ['/static/login.js'] },
  );
}

export function adminLoginPage(error: string | null, lockedSeconds: number): string {
  return layout(
    'Anmelden',
    `<div class="card narrow">
      <h1>Anmelden für Erwachsene</h1>
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
      ${lockedSeconds ? `<p class="error" role="alert">Zu viele Versuche. Bitte ${lockedSeconds} Sekunden warten.</p>` : ''}
      <form method="post" action="/login/admin" class="form">
        <label>Passwort <input type="password" name="password" autocomplete="current-password" required autofocus></label>
        <button class="btn primary">Anmelden</button>
      </form>
      <p><a class="link-quiet" href="/login">⬅️ zurück</a></p>
    </div>`,
    { bodyClass: 'login' },
  );
}

// ---------- Menü ----------

export function menuPage(
  user: SessionUser,
  child: { name: string },
  today: { done: number; total: number },
  stickers: { emoji: string }[],
): string {
  const finished = today.total > 0 && today.done >= today.total;
  const progress = today.total
    ? `<span class="progress-dots">${Array.from({ length: today.total }, (_, i) => `<i class="${i < today.done ? 'on' : ''}"></i>`).join('')}</span>`
    : '';
  const adminTile =
    user.role === 'admin'
      ? `<a class="tile" href="/admin"><span class="tile-emoji">⚙️</span><span class="tile-label">Einstellungen</span></a>`
      : '';
  return layout(
    'Menü',
    `<h1 class="center">${user.role === 'admin' ? `Lesen mit ${esc(child.name)}` : `Hallo ${esc(child.name)}!`}</h1>
     <div class="tiles">
       <a class="tile big today ${finished ? 'finished' : ''}" href="/heute">
         <span class="tile-emoji">${finished ? '🏆' : '📖'}</span>
         <span class="tile-label">Heute lesen</span>
         ${progress}
       </a>
       <a class="tile" href="/buchstaben"><span class="tile-emoji">🔤</span><span class="tile-label">Buchstaben</span></a>
       <a class="tile" href="/archiv"><span class="tile-emoji">📚</span><span class="tile-label">Alle Geschichten</span></a>
       ${adminTile}
     </div>
     <section class="stickers" aria-label="Sticker">
       <h2>Meine Sticker</h2>
       <div class="sticker-row">${stickers.length ? stickers.map((s) => `<span>${esc(s.emoji)}</span>`).join('') : '<span class="hint">Noch keine. Lies heute, dann bekommst du einen!</span>'}</div>
     </section>`,
    { user },
  );
}

// ---------- Aufgaben ----------

export function playerPage(
  user: SessionUser,
  set: StoredSet,
  done: number[],
  settings: ChildSettings,
  opts: { title: string; back: string; isToday: boolean },
): string {
  return layout(
    opts.title,
    `<div id="player" class="player" aria-live="polite"></div>
     <noscript><p class="error">Bitte JavaScript einschalten.</p></noscript>
     ${jsonScript('player-data', {
       setId: set.id,
       tasks: set.tasks,
       done,
       syllableArcs: settings.syllableArcs,
       isToday: opts.isToday,
       backUrl: opts.back,
       isAdmin: user.role === 'admin',
     })}`,
    { user, back: opts.back, bodyClass: 'play', scripts: ['/static/player.js'] },
  );
}

// ---------- Buchstaben ----------

export function lettersPage(user: SessionUser, settings: ChildSettings, flash: string | null): string {
  const known = new Set(settings.graphemes);
  const order = settings.graphemes;
  const isAdmin = user.role === 'admin';
  const tiles = GRAPHEMES.map((g) => {
    const on = known.has(g.id);
    const pos = order.indexOf(g.id);
    const inner = `<span class="letter-big">${esc(g.label)}</span>${pos >= 0 ? `<span class="letter-num">${pos + 1}</span>` : ''}`;
    if (isAdmin) {
      return `<label class="letter ${on ? 'on' : 'off'}">
        <input type="checkbox" name="g" value="${esc(g.id)}" ${on ? 'checked' : ''}>${inner}</label>`;
    }
    return on
      ? `<a class="letter on" href="/buchstaben/${encodeURIComponent(g.id)}">${inner}</a>`
      : `<span class="letter off" aria-label="${esc(g.label)} noch nicht gelernt">${inner}<span class="lock">🔒</span></span>`;
  }).join('');

  const adminHelp = isAdmin
    ? `<p class="hint">Haken setzen = Buchstabe ist bekannt. Die Zahl zeigt die Reihenfolge, in der die Buchstaben dazukamen;
       der zuletzt hinzugefügte wird in den Aufgaben am häufigsten geübt. Nach dem Speichern werden die heutigen Aufgaben neu erzeugt.</p>`
    : `<p class="hint center">Tippe auf einen Buchstaben, den du schon kannst.</p>`;

  const grid = isAdmin
    ? `<form method="post" action="/buchstaben" class="letters-form">
         <div class="letters">${tiles}</div>
         <div class="sticky-actions"><button class="btn primary">Speichern</button></div>
       </form>`
    : `<div class="letters">${tiles}</div>`;

  return layout(
    'Buchstaben',
    `<h1 class="center">Buchstaben</h1>
     ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
     ${adminHelp}
     ${grid}
     ${isAdmin ? '' : `<p class="center"><span class="hint">Du kannst schon ${settings.graphemes.length} Buchstaben! 🎉</span></p>`}`,
    { user, back: '/menu', scripts: isAdmin ? ['/static/letters.js'] : [] },
  );
}

export function letterDetailPage(user: SessionUser, id: string, settings: ChildSettings): string {
  const g = GRAPHEMES.find((x) => x.id === id);
  if (!g) return notFoundPage(user);
  const known = new Set(settings.graphemes);
  const syllables: string[] = [];
  if (VOWELS.includes(id)) {
    for (const c of SIMPLE_CONSONANTS) if (known.has(c)) syllables.push(capitalOf(c) + id);
  } else if (SIMPLE_CONSONANTS.includes(id)) {
    for (const v of VOWELS) if (known.has(v)) syllables.push(capitalOf(id) + v);
  }
  const words = WORDS.filter((w) => segment(w.text)?.includes(id) && isDecodable(w.text, known)).slice(0, 12);
  return layout(
    `Buchstabe ${g.label}`,
    `<div class="center">
       <button class="letter-hero say" data-say="${esc(g.example?.word ?? g.label)}">${esc(g.label)}</button>
       ${g.example ? `<p class="example"><span class="example-img">${esc(g.example.img)}</span> ${esc(g.example.word)}</p>` : ''}
     </div>
     ${syllables.length ? `<h2>Silben</h2><div class="chips">${syllables.map((s) => `<button class="chip say" data-say="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
     ${words.length ? `<h2>Wörter, die du lesen kannst</h2><div class="chips">${words.map((w) => `<button class="chip say" data-say="${esc(w.text)}">${w.img ? `${esc(w.img)} ` : ''}${esc(w.text)}</button>`).join('')}</div>` : ''}
     <p class="hint center">Tippe, dann hörst du es.</p>`,
    { user, back: '/buchstaben', scripts: ['/static/say.js'] },
  );
}

// ---------- Archiv ----------

const TYPE_NAMES: Record<string, string> = {
  silben: 'Silben',
  'wort-bild': 'Wort und Bild',
  'bild-wort': 'Bild und Wort',
  blitz: 'Blitzlesen',
  wortkette: 'Wörterkette',
  buchstabe: 'Buchstaben finden',
  geschichte: 'Geschichte',
};

function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dt);
}

export function letterChips(letters: string[]): string {
  return `<span class="letter-chips">${letters.map((l) => `<span class="lchip">${esc(labelOf(l))}</span>`).join('')}</span>`;
}

export function archivePage(user: SessionUser, sets: StoredSet[], filter: string | null): string {
  const filtered = filter ? sets.filter((s) => s.letters.includes(filter)) : sets;
  const allLetters = GRAPHEMES.map((g) => g.id).filter((id) => sets.some((s) => s.letters.includes(id)));
  const filterBar = allLetters.length
    ? `<nav class="filter" aria-label="Nach Buchstaben filtern">
        <a class="lchip ${filter ? '' : 'active'}" href="/archiv">alle</a>
        ${allLetters.map((l) => `<a class="lchip ${filter === l ? 'active' : ''}" href="/archiv?b=${encodeURIComponent(l)}">${esc(labelOf(l))}</a>`).join('')}
      </nav>`
    : '';
  const items = filtered
    .map((s) => {
      const story = s.tasks.find((t) => t.type === 'geschichte');
      const storyTitles =
        story && story.type === 'geschichte'
          ? story.choices.map((c) => `${esc(c.cover)} ${esc(c.seriesTitle)}: ${esc(c.title)}`).join(' · ')
          : '';
      const types = [...new Set(s.tasks.map((t) => TYPE_NAMES[t.type]))].join(', ');
      return `<a class="archive-item" href="/archiv/${s.id}">
        <span class="archive-date">${esc(dateLabel(s.date))}${s.version ? ` (Version ${s.version + 1})` : ''} ${s.completedAt ? '✅' : ''}</span>
        ${storyTitles ? `<span class="archive-story">${storyTitles}</span>` : ''}
        <span class="archive-types">${s.tasks.length} Aufgaben: ${esc(types)}</span>
        ${letterChips(s.letters)}
      </a>`;
    })
    .join('');
  return layout(
    'Alle Geschichten',
    `<h1 class="center">Alle Geschichten und Aufgaben</h1>
     <p class="hint center">Alles, was schon da war, kannst du noch einmal lesen. Die Kästchen zeigen, welche Buchstaben darin vorkommen.</p>
     ${filterBar}
     <div class="archive">${items || '<p class="hint center">Noch nichts da. Fang mit „Heute lesen“ an!</p>'}</div>`,
    { user, back: '/menu' },
  );
}

// ---------- Einstellungen ----------

export function adminPage(
  user: SessionUser,
  child: { id: number; name: string },
  settings: ChildSettings,
  stats: { total: number; withHelp: number; days: number },
  flash: string | null,
  error: string | null,
): string {
  const pics = PICTURES.map((p) => `<option value="${esc(p.id)}">${esc(p.emoji)} ${esc(p.name)}</option>`).join('');
  const sel = (n: number) => `<select name="p${n}" required><option value="">Tier ${n}</option>${pics}</select>`;
  return layout(
    'Einstellungen',
    `<h1>Einstellungen für ${esc(child.name)}</h1>
     ${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
     ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}

     <section class="card">
       <h2>Überblick</h2>
       <p>${stats.days} Lesetage, ${stats.total} Aufgaben erledigt, davon ${stats.withHelp} mit Hilfe.</p>
       <p>Bekannte Buchstaben (${settings.graphemes.length}): ${letterChips(settings.graphemes)}</p>
       <p><a class="btn" href="/buchstaben">Buchstaben ändern</a></p>
     </section>

     <section class="card">
       <h2>Aufgaben</h2>
       <form method="post" action="/admin/einstellungen" class="form">
         <label>Aufgaben pro Tag (inklusive Geschichte)
           <input type="number" name="tasks" min="${MIN_TASKS}" max="${MAX_TASKS}" value="${settings.tasksPerDay}">
         </label>
         <label class="check"><input type="checkbox" name="arcs" ${settings.syllableArcs ? 'checked' : ''}> Silbenbögen unter den Wörtern anzeigen</label>
         <button class="btn primary">Speichern</button>
       </form>
       <form method="post" action="/admin/neu" class="form">
         <p class="hint">Erzeugt die heutigen Aufgaben neu, zum Beispiel nach neuen Buchstaben. Die alten bleiben im Archiv.</p>
         <button class="btn">Heutige Aufgaben neu erzeugen</button>
       </form>
     </section>

     <section class="card">
       <h2>Bilder-Code für ${esc(child.name)}</h2>
       <p class="hint">${esc(child.name)} meldet sich an, indem drei Tiere in der richtigen Reihenfolge angetippt werden.</p>
       <form method="post" action="/admin/code" class="form row">
         ${sel(1)} ${sel(2)} ${sel(3)}
         <button class="btn primary">Code speichern</button>
       </form>
     </section>

     <section class="card">
       <h2>Admin-Passwort ändern</h2>
       <form method="post" action="/admin/passwort" class="form">
         <label>Aktuelles Passwort <input type="password" name="current" autocomplete="current-password" required></label>
         <label>Neues Passwort (mindestens 8 Zeichen) <input type="password" name="next" autocomplete="new-password" minlength="8" required></label>
         <button class="btn primary">Passwort ändern</button>
       </form>
     </section>`,
    { user, back: '/menu' },
  );
}

export function notFoundPage(user: SessionUser | null): string {
  return layout('Nicht gefunden', `<div class="center"><p class="avatar">🙈</p><h1>Hier ist nichts.</h1><p><a class="btn" href="/">Zum Start</a></p></div>`, {
    user,
  });
}
