// Spielt die Leseaufgaben ab: eine Aufgabe pro Bildschirm, sofortiges Feedback.
import { speak, canSpeak } from './say.js';
import { syllables } from './syllables.js';

const data = JSON.parse(document.getElementById('player-data').textContent);
const root = document.getElementById('player');
const done = new Set(data.done);

const TITLES = {
  silben: 'Leserutsche',
  'wort-bild': 'Welches Bild passt?',
  'bild-wort': 'Welches Wort passt?',
  blitz: 'Blitzlesen',
  wortkette: 'Wörterkette',
  buchstabe: 'Buchstaben finden',
  geschichte: 'Geschichte',
};

const PRAISE = ['Super!', 'Toll gemacht!', 'Klasse!', 'Prima!', 'Spitze!', 'Juhu!', 'Stark!'];

// ---------- kleine Helfer ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

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
        speak(text);
        onUse?.();
      },
    },
    '🔊',
  );
}

function progressBar(index) {
  return h(
    'div',
    { class: 'task-progress', 'aria-label': `Aufgabe ${index + 1} von ${data.tasks.length}` },
    data.tasks.map((_, i) => h('i', { class: done.has(i) ? 'on' : i === index ? 'now' : '' })),
  );
}

function frame(index, body) {
  clear();
  const task = data.tasks[index];
  root.append(progressBar(index), h('h1', { class: 'task-title' }, TITLES[task.type] ?? 'Aufgabe'), body);
}

async function saveResult(index, ok, helpCount, detail) {
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
  setTimeout(() => {
    overlay.remove();
    next();
  }, 1100);
}

async function finishTask(index, ok, helpCount, detail) {
  const result = await saveResult(index, ok, helpCount, detail);
  if (result.sticker) lastSticker = result.sticker;
  celebrate(PRAISE[Math.floor(Math.random() * PRAISE.length)], () => goNext(index));
}

let lastSticker = null;

function goNext(index) {
  const next = data.tasks.findIndex((_, i) => i > index && (!data.isToday || !done.has(i)));
  if (next >= 0) return runTask(next);
  const firstOpen = data.isToday ? data.tasks.findIndex((_, i) => !done.has(i)) : -1;
  if (firstOpen >= 0) return runTask(firstOpen);
  showEnd();
}

// ---------- Start und Ende ----------

function showStart() {
  clear();
  const allDone = data.isToday && data.tasks.every((_, i) => done.has(i));
  if (allDone) return showEnd(true);
  const open = data.tasks.filter((_, i) => !data.isToday || !done.has(i)).length;
  root.append(
    h('div', { class: 'start center' },
      h('div', { class: 'avatar' }, data.isToday ? '📖' : '📚'),
      h('h1', {}, data.isToday ? 'Heute lesen' : 'Noch einmal lesen'),
      progressBar(-1),
      h('p', { class: 'hint' }, data.isToday && done.size ? `Noch ${open} Aufgaben. Weiter geht's!` : `${open} kleine Aufgaben warten auf dich.`),
      h('button', { class: 'btn primary huge', type: 'button', onclick: () => goNext(-1) }, "Los geht's! ▶"),
    ),
  );
}

function showEnd(already = false) {
  clear();
  const story = data.tasks.find((t) => t.type === 'geschichte');
  const teaser = story?.choices?.[0]?.teaser;
  root.append(
    h('div', { class: 'end center' },
      h('div', { class: 'trophy' }, lastSticker ?? '🏆'),
      h('h1', {}, already ? 'Heute schon alles geschafft!' : 'Alles geschafft!'),
      lastSticker ? h('p', { class: 'big-hint' }, 'Du hast einen neuen Sticker bekommen!') : null,
      teaser && data.isToday ? h('p', { class: 'teaser' }, '🔮 Morgen: ', teaser) : null,
      h('div', { class: 'row-center' },
        h('a', { class: 'btn primary', href: data.backUrl }, 'Zum Menü'),
        h('a', { class: 'btn', href: '/archiv' }, 'Noch einmal lesen'),
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

const RUNNERS = {
  silben(task, index) {
    let help = 0;
    const left = h('span', { class: 'slide-block consonant' }, task.syllable.slice(0, task.syllable.length - task.vowel.length));
    const right = h('span', { class: 'slide-block vowel' }, task.vowel);
    const track = h('div', { class: 'slide-track' }, left, h('span', { class: 'slide-ramp' }, '🛝'), right);
    const result = h('div', { class: 'syllable-result hidden' }, wordEl(task.syllable, 'huge'));
    const more = h('div', { class: 'chips hidden' }, task.more.map((s) => h('span', { class: 'chip big' }, wordEl(s))));
    const doneBtn = h('button', { class: 'btn primary huge hidden', type: 'button', onclick: () => finishTask(index, true, help) }, 'Geschafft ✓');
    const slideBtn = h(
      'button',
      {
        class: 'btn huge',
        type: 'button',
        onclick: () => {
          track.classList.add('slid');
          setTimeout(() => {
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
        h('div', { class: 'row-center' }, speakBtn(task.syllable.toLowerCase(), () => help++, 'Silbe anhören')),
        more,
        doneBtn,
      ),
    );
  },

  'wort-bild'(task, index) {
    let help = 0;
    let wrong = 0;
    const options = task.options.map((o) => {
      const btn = h('button', { class: 'pic-option', type: 'button' }, o.img);
      btn.addEventListener('click', () => {
        if (o.correct) {
          btn.classList.add('right');
          finishTask(index, wrong === 0, help + wrong);
        } else {
          wrong++;
          shake(btn);
          btn.disabled = true;
        }
      });
      return btn;
    });
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lies das Wort. Tippe auf das passende Bild.'),
        h('div', { class: 'big-word' }, wordEl(task.word, 'huge')),
        h('div', { class: 'row-center' }, speakBtn(task.word, () => help++, 'Wort anhören')),
        h('div', { class: 'pic-options' }, options),
      ),
    );
  },

  'bild-wort'(task, index) {
    let wrong = 0;
    const options = task.options.map((o) => {
      const btn = h('button', { class: 'word-option', type: 'button' }, wordEl(o.word));
      btn.addEventListener('click', () => {
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
    const show = () => {
      showBtn.classList.add('hidden');
      optionsBox.classList.add('hidden');
      flash.classList.remove('hidden');
      setTimeout(() => {
        flash.classList.add('hidden');
        optionsBox.classList.remove('hidden');
        againBtn.classList.remove('hidden');
      }, 2500);
    };
    showBtn.addEventListener('click', show);
    const againBtn = h('button', { class: 'btn hidden', type: 'button', onclick: () => { help++; againBtn.classList.add('hidden'); show(); } }, 'Nochmal zeigen 👀');
    task.options.forEach((w) => {
      const btn = h('button', { class: 'word-option', type: 'button' }, wordEl(w));
      btn.addEventListener('click', () => {
        if (w === task.word) {
          btn.classList.add('right');
          finishTask(index, wrong === 0, help + wrong);
        } else {
          wrong++;
          shake(btn);
          btn.disabled = true;
        }
      });
      optionsBox.append(btn);
    });
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
    const helpBtn = speakBtn('', null, 'Wort anhören');
    if (helpBtn) {
      helpBtn.onclick = () => {
        if (pos < task.words.length) {
          speak(task.words[pos]);
          help++;
        }
      };
    }
    btns.forEach((btn, i) =>
      btn.addEventListener('click', () => {
        if (i !== pos) return;
        btn.classList.remove('next');
        btn.classList.add('read');
        pos++;
        if (pos < btns.length) btns[pos].classList.add('next');
        else {
          doneBtn.classList.remove('hidden');
          helpBtn?.classList.add('hidden');
        }
      }),
    );
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Lies ein Wort nach dem anderen laut. Tippe es an, wenn du es gelesen hast.'),
        h('div', { class: 'chain' }, btns),
        h('div', { class: 'row-center' }, helpBtn),
        doneBtn,
      ),
    );
  },

  buchstabe(task, index) {
    let wrong = 0;
    const total = task.grid.filter((c) => c.toLowerCase() === task.target).length;
    let found = 0;
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
    const counter = h('p', { class: 'hint' }, `0 von ${total}`);
    const upper = task.target.toUpperCase();
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Finde alle:'),
        h('div', { class: 'target-letter' }, `${upper} ${task.target}`),
        h('div', { class: 'letter-grid' }, cells),
        counter,
      ),
    );
  },

  geschichte(task, index) {
    if (task.choices.length === 1) return readStory(task.choices[0], index);
    frame(
      index,
      h('div', { class: 'task center' },
        h('p', { class: 'hint' }, 'Welche Geschichte möchtest du heute lesen?'),
        h('div', { class: 'story-choices' },
          task.choices.map((c) =>
            h('button', { class: 'story-card', type: 'button', onclick: () => readStory(c, index) },
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

function readStory(ep, index) {
  let help = 0;
  let line = 0;

  const render = () => {
    clear();
    const lines = ep.lines.slice(0, line + 1).map((segments, i) =>
      h('p', { class: `story-line ${i === line ? 'current' : 'past'}` },
        segments.flatMap((s) => {
          // Leerzeichen außerhalb der Knöpfe, sonst verschwinden sie
          const lead = s.text.match(/^\s*/)[0];
          const trail = s.text.match(/\s*$/)[0];
          const text = s.text.trim();
          if (!text) return [s.text];
          const btn = s.child
            ? h('button', { class: 'seg child', type: 'button', title: 'Antippen zum Anhören', onclick: () => { speak(text.replace(/[^A-Za-zÄÖÜäöüß ]/g, '')); help++; } }, wordEl(text))
            : h('button', { class: 'seg adult', type: 'button', title: 'Antippen zum Vorlesen', onclick: () => speak(text) }, text);
          return [lead, btn, trail];
        }),
      ),
    );
    const last = line >= ep.lines.length - 1;
    root.append(
      progressBar(index),
      h('h1', { class: 'task-title' }, `${ep.cover} ${ep.title}`),
      h('p', { class: 'hint' }, 'Die großen Wörter liest du. Den grauen Text liest jemand vor (oder antippen).'),
      h('div', { class: 'story' }, lines),
      h('div', { class: 'row-center' },
        h('button', {
          class: 'btn primary huge',
          type: 'button',
          onclick: () => {
            if (last) askQuestion(ep, index, help);
            else {
              line++;
              render();
            }
          },
        }, last ? 'Fertig gelesen ✓' : 'Weiter ▶'),
      ),
    );
    const current = root.querySelector('.story-line.current');
    current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  render();
}

function askQuestion(ep, index, help) {
  let wrong = 0;
  const q = ep.question;
  clear();
  const options = q.options.map((o) => {
    const btn = h('button', { class: 'pic-option', type: 'button', 'aria-label': o.label }, o.img);
    btn.addEventListener('click', () => {
      if (o.correct) {
        btn.classList.add('right');
        finishTask(index, wrong === 0, help + wrong, { series: ep.series, number: ep.number });
      } else {
        wrong++;
        shake(btn);
        btn.disabled = true;
      }
    });
    return btn;
  });
  root.append(
    progressBar(index),
    h('h1', { class: 'task-title' }, 'Hast du gut aufgepasst?'),
    h('div', { class: 'task center' },
      h('p', { class: 'question' }, q.text, ' ', speakBtn(q.text)),
      h('div', { class: 'pic-options' }, options),
    ),
  );
  speak(q.text);
}

showStart();
