// Spielt die Leseaufgaben ab: eine Aufgabe pro Bildschirm, sofortiges Feedback.
// Jeder Bildschirm kommt auf einen Stapel. "Zurück" (oben links oder die
// Zurück-Geste des Geräts) geht genau einen Bildschirm zurück.
import { speak, canSpeak } from './say.js';
import { syllables } from './syllables.js';
import { h } from './dom.js';

const data = JSON.parse(document.getElementById('player-data').textContent);
const root = document.getElementById('player');
const done = new Set(data.done);
// Welche Aufgaben in dieser Runde dran sind (z. B. nur Übungen oder nur eine)
const order = Array.isArray(data.only) ? data.only : data.tasks.map((_, i) => i);
const HELP_DELAY_MS = 15000;

const TITLES = {
  silben: 'Leserutsche',
  'wort-bild': 'Welches Bild passt?',
  'bild-wort': 'Welches Wort passt?',
  blitz: 'Blitzlesen',
  wortkette: 'Wörterkette',
  buchstabe: 'Buchstaben finden',
  laut: 'Neuer Buchstabe',
  anlaut: 'Womit fängt es an?',
  satz: 'Satz lesen',
  geschichte: 'Geschichte',
};

const PRAISE = ['Super!', 'Toll gemacht!', 'Klasse!', 'Prima!', 'Spitze!', 'Juhu!', 'Stark!'];

// ---------- kleine Helfer ----------

function clear() {
  root.replaceChildren();
  window.scrollTo(0, 0);
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth; // Animation neu starten
  el.classList.add('shake');
}

/** Ein Wort mit optionalen Silbenbögen. */
function wordEl(text, cls = '') {
  if (!data.syllableArcs) return h('span', { class: `w ${cls}` }, text);
  // Satzzeichen nicht mit Bögen versehen
  const parts = text.split(/([A-Za-zÄÖÜäöüß]+)/).filter(Boolean);
  return h(
    'span',
    { class: `w ${cls}` },
    parts.map((p) =>
      /^[A-Za-zÄÖÜäöüß]+$/.test(p) ? h('span', { class: 'word-arcs' }, syllables(p).map((s) => h('span', { class: 'syl' }, s))) : p,
    ),
  );
}

/** Knopf zum Vorlesen von Text, den das Kind NICHT selbst lesen muss. */
function speakBtn(text, onUse, label = 'Vorlesen') {
  if (!canSpeak()) return null;
  return h(
    'button',
    {
      class: 'btn-icon speak',
      type: 'button',
      'aria-label': label,
      title: label,
      onclick: () => {
        speak(typeof text === 'function' ? text() : text);
        onUse?.();
      },
    },
    '🔊',
  );
}

/**
 * Hilfe-Knopf für Wörter, die das Kind selbst lesen soll. Richtet sich nach
 * der Einstellung "Vorlesen beim Antippen": sofort, erst später oder gar nicht.
 * Gibt { el, reveal } zurück; reveal() zeigt den Knopf früher (z. B. nach einem Fehler).
 */
function childHelp(text, onUse, label = 'Wort anhören') {
  const btn = data.readAloud === 'aus' ? null : speakBtn(text, onUse, label);
  if (!btn) return { el: null, reveal() {} };
  if (data.readAloud !== 'spaeter') return { el: btn, reveal() {} };
  btn.classList.add('hidden');
  const reveal = () => btn.classList.remove('hidden');
  later(reveal, HELP_DELAY_MS);
  return { el: btn, reveal };
}

function progressBar(index) {
  return h(
    'div',
    { class: 'task-progress', 'aria-label': index >= 0 ? `Aufgabe ${order.indexOf(index) + 1} von ${order.length}` : `${order.length} Aufgaben` },
    order.map((i) => h('i', { class: done.has(i) && data.setId ? 'on' : i === index ? 'now' : '' })),
  );
}

function frame(index, body) {
  clear();
  const task = data.tasks[index];
  root.append(progressBar(index), h('h1', { class: 'task-title' }, TITLES[task.type] ?? 'Aufgabe'), body);
}

// ---------- Bildschirme und Zurück ----------

const stack = [];
let screenId = 0;

/** Zeitgeber, der verfällt, sobald ein anderer Bildschirm gezeigt wird. */
function later(fn, ms) {
  const mine = screenId;
  setTimeout(() => {
    if (mine === screenId) fn();
  }, ms);
}

function show(render) {
  screenId++;
  window.speechSynthesis?.cancel();
  document.querySelector('.celebrate')?.remove();
  render();
}

/** Neuen Bildschirm zeigen (kommt auf den Stapel). */
function go(render) {
  stack.push(render);
  if (stack.length > 1) history.pushState({ leselern: stack.length }, '');
  show(render);
}

function leave() {
  window.speechSynthesis?.cancel();
  location.href = data.backUrl;
}

function back() {
  if (stack.length <= 1) return leave();
  history.back(); // löst popstate aus
}

window.addEventListener('popstate', () => {
  if (stack.length <= 1) return leave();
  stack.pop();
  show(stack[stack.length - 1]);
});

const backBtn = document.getElementById('back-btn');
backBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  back();
});

// ---------- Ergebnisse ----------

async function saveResult(index, ok, helpCount, detail) {
  if (!data.setId) return { sticker: null }; // nur üben, nichts speichern
  done.add(index);
  try {
    const res = await fetch('/api/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId: data.setId, taskIndex: index, ok, helpCount, detail }),
    });
    if (res.ok) return await res.json();
  } catch {
    /* offline: nicht schlimm, weiter geht's */
  }
  return { sticker: null };
}

function celebrate(text, next) {
  const overlay = h(
    'div',
    { class: 'celebrate', role: 'status' },
    h('div', { class: 'celebrate-star' }, '⭐'),
    h('div', { class: 'celebrate-text' }, text),
  );
  document.body.append(overlay);
  const mine = screenId;
  setTimeout(() => {
    overlay.remove();
    if (mine === screenId) next();
  }, 1100);
}

let lastSticker = null;
const finished = new Set(); // in dieser Runde erledigt

async function finishTask(index, ok, helpCount, detail) {
  finished.add(index);
  const mine = screenId;
  const result = await saveResult(index, ok, helpCount, detail);
  if (result.sticker) lastSticker = result.sticker;
  if (mine !== screenId) return; // inzwischen zurückgegangen
  celebrate(PRAISE[Math.floor(Math.random() * PRAISE.length)], () => goNext(index));
}

function isOpen(i) {
  return !finished.has(i) && !(data.isToday && done.has(i));
}

function goNext(index) {
  const pos = order.indexOf(index);
  const next = order.find((i, k) => k > pos && isOpen(i));
  if (next !== undefined) return go(() => runTask(next));
  const firstOpen = order.find((i) => isOpen(i));
  if (firstOpen !== undefined && firstOpen !== index) return go(() => runTask(firstOpen));
  go(() => showEnd());
}

// ---------- Start und Ende ----------

function showStart() {
  clear();
  const allDone = data.isToday && order.every((i) => done.has(i));
  if (allDone) return showEnd(true);
  const open = order.filter((i) => isOpen(i)).length;
  root.append(
    h('div', { class: 'start center' },
      h('div', { class: 'avatar' }, data.startEmoji),
      h('h1', {}, data.startTitle),
      progressBar(-1),
      h('p', { class: 'hint' }, data.isToday && open < order.length ? `Noch ${open} Aufgaben. Weiter geht's!` : `${open} kleine Aufgaben warten auf dich.`),
      h('button', { class: 'btn primary huge', type: 'button', onclick: () => goNext(-1) }, "Los geht's! ▶"),
    ),
  );
}

function showEnd(already = false) {
  clear();
  const story = order.map((i) => data.tasks[i]).find((t) => t.type === 'geschichte');
  const teaser = story?.choices?.[0]?.teaser;
  const dayDone = data.isToday && data.tasks.every((_, i) => done.has(i));
  const partial = order.length < data.tasks.length;
  let headline = already ? 'Das hast du heute schon geschafft!' : 'Geschafft!';
  if (!already && dayDone) headline = 'Alles für heute geschafft!';
  root.append(
    h('div', { class: 'end center' },
      h('div', { class: 'trophy' }, lastSticker ?? (dayDone ? '🏆' : '⭐')),
      h('h1', {}, headline),
      lastSticker ? h('p', { class: 'big-hint' }, 'Du hast einen neuen Sticker bekommen!') : null,
      data.isToday && partial && !dayDone ? h('p', { class: 'hint' }, 'Wenn du alles von heute schaffst, bekommst du einen Sticker.') : null,
      teaser && data.isToday ? h('p', { class: 'teaser' }, '🔮 Morgen: ', teaser) : null,
      h('div', { class: 'row-center' },
        data.againUrl ? h('a', { class: 'btn primary huge', href: data.againUrl }, 'Noch eine Runde 🔁') : null,
        h('a', { class: `btn ${data.againUrl ? '' : 'primary huge'}`, href: data.backUrl }, data.backUrl === '/menu' ? 'Zum Menü' : 'Fertig ✓'),
      ),
    ),
  );
}

// ---------- Aufgaben ----------

function runTask(index) {
  const task = data.tasks[index];
  const runner = RUNNERS[task.type];
  if (!runner) return goNext(index);
  runner(task, index);
}

/** Antwort-Knöpfe: richtig = weiter, falsch = wackeln und ausgrauen. */
function answer(btn, correct, onRight, onWrong) {
  btn.addEventListener('click', () => {
    if (correct) {
      btn.classList.add('right');
      onRight();
    } else {
      shake(btn);
      btn.disabled = true;
      onWrong();
    }
  });
  return btn;
}

const RUNNERS = {
  silben(task, index) {
    let help = 0;
    const left = h('span', { class: 'slide-block consonant' }, task.syllable.slice(0, task.syllable.length - task.vowel.length));
    const right = h('span', { class: 'slide-block vowel' }, task.vowel);
    const track = h('div', { class: 'slide-track' }, left, h('span', { class: 'slide-ramp' }, '🛝'), right);
    const result = h('div', { class: 'syllable-result hidden' }, wordEl(task.syllable, 'huge'));
    const more = h('div', { class: 'chips hidden' }, task.more.map((s) => h('span', { class: 'chip big' }, wordEl(s))));
    const doneBtn = h('button', { class: 'btn primary huge hidden', type: 'button', onclick: () => finishTask(index, true, help) }, 'Geschafft ✓');
    const helper = childHelp(task.syllable.toLowerCase(), () => help++, 'Silbe anhören');
    const slideBtn = h(
      'button',
      {
        class: 'btn huge',
        type: 'button',
        onclick: () => {
          track.classList.add('slid');
          later(() => {
            result.classList.remove('hidden');
            more.classList.remove('hidden');
            doneBtn.classList.remove('hidden');
            slideBtn.classList.add('hidden');
          }, 700);
        },
      },
      'Rutschen! 🛝',
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lass die Buchstaben zusammenrutschen und lies laut.'),
        track,
        slideBtn,
        result,
        h('div', { class: 'row-center' }, helper.el),
        more,
        doneBtn,
      ),
    );
  },

  'wort-bild'(task, index) {
    let help = 0;
    let wrong = 0;
    const helper = childHelp(task.word, () => help++);
    const options = task.options.map((o) =>
      answer(h('button', { class: 'pic-option', type: 'button' }, o.img), o.correct,
        () => finishTask(index, wrong === 0, help + wrong),
        () => { wrong++; helper.reveal(); }),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lies das Wort. Tippe auf das passende Bild.'),
        h('div', { class: 'big-word' }, wordEl(task.word, 'huge')),
        h('div', { class: 'row-center' }, helper.el),
        h('div', { class: 'pic-options' }, options),
      ),
    );
  },

  'bild-wort'(task, index) {
    let wrong = 0;
    const options = task.options.map((o) =>
      answer(h('button', { class: 'word-option', type: 'button' }, wordEl(o.word)), o.correct,
        () => finishTask(index, wrong === 0, wrong),
        () => wrong++),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Was ist das? Tippe auf das richtige Wort.'),
        h('div', { class: 'big-picture' }, task.img),
        h('div', { class: 'word-options' }, options),
      ),
    );
  },

  blitz(task, index) {
    let help = 0;
    let wrong = 0;
    const flash = h('div', { class: 'flash-word hidden' }, wordEl(task.word, 'huge'));
    const optionsBox = h('div', { class: 'word-options hidden' });
    const showBtn = h('button', { class: 'btn primary huge', type: 'button' }, 'Zeig mir das Wort! ⚡');
    const againBtn = h('button', { class: 'btn hidden', type: 'button' }, 'Nochmal zeigen 👀');
    const flashIt = () => {
      showBtn.classList.add('hidden');
      againBtn.classList.add('hidden');
      optionsBox.classList.add('hidden');
      flash.classList.remove('hidden');
      later(() => {
        flash.classList.add('hidden');
        optionsBox.classList.remove('hidden');
        againBtn.classList.remove('hidden');
      }, 2500);
    };
    showBtn.addEventListener('click', flashIt);
    againBtn.addEventListener('click', () => { help++; flashIt(); });
    task.options.forEach((w) =>
      optionsBox.append(
        answer(h('button', { class: 'word-option', type: 'button' }, wordEl(w)), w === task.word,
          () => finishTask(index, wrong === 0, help + wrong),
          () => wrong++),
      ),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Das Wort ist nur kurz zu sehen. Welches war es?'),
        showBtn,
        flash,
        optionsBox,
        againBtn,
      ),
    );
  },

  wortkette(task, index) {
    let help = 0;
    let pos = 0;
    const btns = task.words.map((w, i) =>
      h('button', { class: `chain-word ${i === 0 ? 'next' : ''}`, type: 'button' }, wordEl(w)),
    );
    const doneBtn = h('button', { class: 'btn primary huge hidden', type: 'button', onclick: () => finishTask(index, true, help) }, 'Geschafft ✓');
    const helper = childHelp(() => task.words[Math.min(pos, task.words.length - 1)], () => help++);
    btns.forEach((btn, i) =>
      btn.addEventListener('click', () => {
        if (i !== pos) return;
        btn.classList.remove('next');
        btn.classList.add('read');
        pos++;
        if (pos < btns.length) btns[pos].classList.add('next');
        else {
          doneBtn.classList.remove('hidden');
          helper.el?.remove();
        }
      }),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lies ein Wort nach dem anderen laut. Tippe es an, wenn du es gelesen hast.'),
        h('div', { class: 'chain' }, btns),
        h('div', { class: 'row-center' }, helper.el),
        doneBtn,
      ),
    );
  },

  buchstabe(task, index) {
    let wrong = 0;
    const total = task.grid.filter((c) => c.toLowerCase() === task.target).length;
    let found = 0;
    const counter = h('p', { class: 'hint' }, `0 von ${total}`);
    const cells = task.grid.map((c) => {
      const btn = h('button', { class: 'letter-cell', type: 'button' }, c);
      btn.addEventListener('click', () => {
        if (btn.classList.contains('right')) return;
        if (c.toLowerCase() === task.target) {
          btn.classList.add('right');
          found++;
          counter.textContent = `${found} von ${total}`;
          if (found === total) finishTask(index, wrong === 0, wrong);
        } else {
          wrong++;
          shake(btn);
        }
      });
      return btn;
    });
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Finde alle:'),
        h('div', { class: 'target-letter' }, `${task.target.toUpperCase()} ${task.target}`),
        h('div', { class: 'letter-grid' }, cells),
        counter,
      ),
    );
  },

  // Neuer Buchstabe: anschauen, Laut hören, nachsprechen.
  laut(task, index) {
    const big = task.target.replace('-', '');
    const upper = big.charAt(0).toUpperCase() + big.slice(1);
    const hero = h('button', { class: 'letter-hero', type: 'button', onclick: () => speak(task.say) }, `${upper} ${big}`);
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Schau dir den Buchstaben an. Tippe drauf und sprich nach.'),
        hero,
        h('p', { class: 'example' }, h('span', { class: 'example-img' }, task.img), ' ', h('span', { class: 'adult-text' }, task.word)),
        h('p', { class: 'hint adult-tip' }, '👩 Für Erwachsene: ', task.tip),
        h('button', { class: 'btn primary huge', type: 'button', onclick: () => finishTask(index, true, 0) }, 'Ich kenne ihn ✓'),
      ),
    );
    later(() => speak(task.say), 400);
  },

  // Welches Bild fängt mit dem Laut an? Das Kind hört die Wörter und liest nur den Buchstaben.
  anlaut(task, index) {
    let wrong = 0;
    const big = task.target.replace('-', '');
    const upper = big.charAt(0).toUpperCase() + big.slice(1);
    const options = task.options.map((o) => {
      const btn = h('button', { class: 'pic-option', type: 'button', 'aria-label': o.word }, o.img);
      btn.addEventListener('click', () => {
        speak(o.word);
        if (o.correct) {
          btn.classList.add('right');
          finishTask(index, wrong === 0, wrong);
        } else {
          wrong++;
          shake(btn);
          btn.disabled = true;
        }
      });
      return btn;
    });
    const sayAll = () => speak(task.options.map((o) => o.word).join(', '));
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Welches Bild fängt so an?'),
        h('div', { class: 'target-letter' }, `${upper} ${big}`),
        h('div', { class: 'pic-options' }, options),
        h('div', { class: 'row-center' }, speakBtn(sayAll, null, 'Alle Bilder anhören')),
      ),
    );
  },

  // Einen kleinen Satz lesen und das passende Bild antippen.
  satz(task, index) {
    let help = 0;
    let wrong = 0;
    const helper = childHelp(task.text, () => help++, 'Satz anhören');
    const options = task.options.map((o) =>
      answer(h('button', { class: 'pic-option', type: 'button' }, o.img), o.correct,
        () => finishTask(index, wrong === 0, help + wrong),
        () => { wrong++; helper.reveal(); }),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lies den Satz. Welches Bild passt?'),
        h('div', { class: 'big-sentence' }, task.text.split(' ').map((w) => [wordEl(w), ' '])),
        h('div', { class: 'row-center' }, helper.el),
        h('div', { class: 'pic-options' }, options),
      ),
    );
  },

  geschichte(task, index) {
    if (task.choices.length === 1) return readStory(task.choices[0], index, 0);
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Welche Geschichte möchtest du heute lesen?'),
        h('div', { class: 'story-choices' },
          task.choices.map((c) =>
            h('button', { class: 'story-card', type: 'button', onclick: () => go(() => readStory(c, index, 0)) },
              h('span', { class: 'story-cover' }, c.cover),
              h('span', { class: 'story-series' }, c.seriesTitle),
              h('span', { class: 'story-title' }, `Folge ${c.number}: ${c.title}`),
            ),
          ),
        ),
      ),
    );
  },
};

let storyHelp = 0;

function readStory(ep, index, line) {
  if (line === 0) storyHelp = 0;
  clear();
  const childMode = data.readAloud; // an | spaeter | aus
  const childSegs = [];
  const lines = ep.lines.slice(0, line + 1).map((segments, i) =>
    h('p', { class: `story-line ${i === line ? 'current' : 'past'}` },
      segments.flatMap((s) => {
        // Leerzeichen außerhalb der Knöpfe, sonst verschwinden sie
        const lead = s.text.match(/^\s*/)[0];
        const trail = s.text.match(/\s*$/)[0];
        const text = s.text.trim();
        if (!text) return [s.text];
        let el;
        if (s.child) {
          if (childMode === 'aus') {
            el = h('span', { class: 'seg child' }, wordEl(text));
          } else {
            const locked = childMode === 'spaeter' && i === line;
            el = h('button', {
              class: `seg child ${locked ? 'locked' : ''}`,
              type: 'button',
              title: 'Antippen zum Anhören',
              onclick: () => {
                if (el.classList.contains('locked')) return shake(el);
                speak(text.replace(/[^A-Za-zÄÖÜäöüß ]/g, ''));
                storyHelp++;
              },
            }, wordEl(text));
            if (locked) childSegs.push(el);
          }
        } else if (data.adultTap) {
          el = h('button', { class: 'seg adult', type: 'button', title: 'Antippen zum Vorlesen', onclick: () => speak(text) }, text);
        } else {
          el = h('span', { class: 'seg adult' }, text);
        }
        return [lead, el, trail];
      }),
    ),
  );
  if (childSegs.length) later(() => childSegs.forEach((el) => el.classList.remove('locked')), HELP_DELAY_MS);
  const last = line >= ep.lines.length - 1;
  root.append(
    progressBar(index),
    h('h1', { class: 'task-title' }, `${ep.cover} ${ep.title}`),
    h('p', { class: 'hint' }, data.adultTap
      ? 'Die großen Wörter liest du. Den grauen Text liest jemand vor (oder antippen).'
      : 'Die großen Wörter liest du. Den grauen Text liest jemand vor.'),
    h('div', { class: 'story' }, lines),
    h('div', { class: 'row-center' },
      h('button', {
        class: 'btn primary huge',
        type: 'button',
        onclick: () => (last ? go(() => askQuestion(ep, index)) : go(() => readStory(ep, index, line + 1))),
      }, last ? 'Fertig gelesen ✓' : 'Weiter ▶'),
    ),
  );
  const current = root.querySelector('.story-line.current');
  current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function askQuestion(ep, index) {
  let wrong = 0;
  const q = ep.question;
  clear();
  const options = q.options.map((o) =>
    answer(h('button', { class: 'pic-option', type: 'button', 'aria-label': o.label }, o.img), o.correct,
      () => finishTask(index, wrong === 0, storyHelp + wrong, { series: ep.series, number: ep.number }),
      () => wrong++),
  );
  root.append(
    progressBar(index),
    h('h1', { class: 'task-title' }, 'Hast du gut aufgepasst?'),
    h('div', { class: 'task center' },
      h('p', { class: 'question' }, q.text, ' ', speakBtn(q.text)),
      h('div', { class: 'pic-options' }, options),
    ),
  );
  later(() => speak(q.text), 300);
}

// ---------- Start ----------

if (data.skipStart && order.length) {
  const first = order.find((i) => isOpen(i)) ?? order[0];
  go(() => runTask(first));
} else {
  go(showStart);
}
