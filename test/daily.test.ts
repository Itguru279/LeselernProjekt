import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDailySet, generateLesson, validateSet, MIN_TASKS, MAX_TASKS, type Task } from '../src/generator/daily.ts';
import { GRAPHEMES } from '../src/generator/graphemes.ts';
import { LETTER_ORDER } from '../src/content/letters.ts';

// Andere Reihenfolge als die Fibel: Der Prüfer muss auch damit klarkommen.
const ORDER = ['a', 'm', 'l', 'o', 'i', 'e', 'u', 'n', 'r', 's', 't', 'f', 'w', 'h', 'd', 'ei', 'au', 'k', 'b', 'g', 'p', 'sch', 'ch', 'ie', 'eu', 'z', 'st-', 'sp-'];
const ORDERS = [ORDER, [...LETTER_ORDER, 'h', 'd', 'ei', 'au', 'k', 'sch']];

test('alle Kind-Wörter sind lesbar, für viele Lernstände und Tage', () => {
  for (const order of ORDERS) {
    for (let n = 1; n <= order.length; n++) {
      const known = order.slice(0, n);
      for (let day = 1; day <= 12; day++) {
        const date = `2026-11-${String(day).padStart(2, '0')}`;
        for (const count of [5, 7, 10]) {
          const progress = { lola: day % 4, emil: (day + 1) % 4, mimi: day % 5, lulu: (day + 2) % 5, finn: day % 6 };
          const set = generateDailySet({ userId: 1, date, known, taskCount: count, storyProgress: progress });
          assert.deepEqual(validateSet(set, known), [], `${known.join('')} ${date}`);
          assert.ok(set.tasks.length >= 1);
          assert.ok(set.tasks.length <= MAX_TASKS);
        }
      }
    }
  }
});

test('Lernaufgaben je Buchstabe: lesbar, mit Laut und Anlaut, nur für Freigeschaltetes', () => {
  for (let n = 2; n <= LETTER_ORDER.length; n++) {
    const known = LETTER_ORDER.slice(0, n);
    const letter = known[n - 1];
    for (const round of [0, 1, 2]) {
      const lesson = generateLesson({ userId: 1, date: '2026-11-01', letter, known, round });
      assert.deepEqual(validateSet(lesson, known), [], `${letter} Runde ${round}`);
      const types = lesson.tasks.map((t) => t.type);
      assert.equal(types[0], 'laut', letter);
      assert.ok(types.includes('anlaut'), `${letter}: ${types}`);
      assert.ok(lesson.tasks.length >= (n >= 3 ? 5 : 4), `${letter}: nur ${types}`);
      const anlaut = lesson.tasks.find((t) => t.type === 'anlaut') as Extract<Task, { type: 'anlaut' }>;
      assert.equal(anlaut.target, letter);
      assert.equal(anlaut.options.filter((o) => o.correct).length, 1);
    }
  }
  assert.throws(() => generateLesson({ userId: 1, date: '2026-11-01', letter: 'u', known: ['a', 'm'] }));
});

test('die Geschichte der neuesten Buchstabenstufe wird angeboten', () => {
  for (let n = LETTER_ORDER.indexOf('e') + 1; n <= LETTER_ORDER.length; n++) {
    const known = LETTER_ORDER.slice(0, n);
    const set = generateDailySet({ userId: 1, date: '2026-11-03', known, taskCount: 7, storyProgress: {} });
    const story = set.tasks.at(-1) as Extract<Task, { type: 'geschichte' }>;
    assert.equal(story.type, 'geschichte');
    assert.equal(story.choices.length, 2);
    const levelSeries = { e: 'mimi', u: 'lulu', s: 'sisi', f: 'fio', n: 'finn', w: 'wolfi', r: 'rufus', t: 'toni', p: 'pit' } as Record<string, string>;
    assert.equal(story.choices[0].series, levelSeries[known[n - 1]], known.join(''));
  }
});

test('fertig gelesene Serien kommen nach den ungelesenen', () => {
  const known = LETTER_ORDER.slice(0, 7); // bis U
  const set = generateDailySet({ userId: 1, date: '2026-11-03', known, taskCount: 7, storyProgress: { lulu: 5, mimi: 2 } });
  const story = set.tasks.at(-1) as Extract<Task, { type: 'geschichte' }>;
  assert.deepEqual(story.choices.map((c) => [c.series, c.number]), [['mimi', 3], ['lola', 1]]);
});

test('mit den Startbuchstaben gibt es 5 bis 10 Aufgaben inklusive Geschichte', () => {
  const known = ['a', 'm', 'l', 'o', 'i', 'e'];
  for (const count of [3, 5, 7, 10, 20]) {
    const set = generateDailySet({ userId: 1, date: '2026-10-24', known, taskCount: count, storyProgress: {} });
    assert.ok(set.tasks.length >= MIN_TASKS && set.tasks.length <= MAX_TASKS, String(set.tasks.length));
    assert.equal(set.tasks.at(-1)?.type, 'geschichte');
  }
});

test('gleicher Tag = gleiche Aufgaben, neue Version = andere Aufgaben', () => {
  const base = { userId: 1, date: '2026-10-24', known: ['a', 'm', 'l', 'o', 'i', 'e'], taskCount: 7, storyProgress: {} };
  assert.deepEqual(generateDailySet(base), generateDailySet(base));
  assert.notDeepEqual(generateDailySet(base).tasks, generateDailySet({ ...base, version: 1 }).tasks);
});

test('der neueste Buchstabe kommt häufig vor', () => {
  const known = ['a', 'm', 'l', 'o', 'i', 'e', 'n'];
  let withN = 0;
  for (let d = 1; d <= 20; d++) {
    const set = generateDailySet({ userId: 1, date: `2026-12-${String(d).padStart(2, '0')}`, known, taskCount: 7, storyProgress: {} });
    if (set.letters.includes('n')) withN++;
  }
  assert.ok(withN >= 15, `nur ${withN} von 20 Tagen mit n`);
});

test('mit allen Lauten funktioniert es auch', () => {
  const known = GRAPHEMES.map((g) => g.id);
  const set = generateDailySet({ userId: 2, date: '2026-10-24', known, taskCount: 10, storyProgress: {} });
  assert.equal(set.tasks.length, 10);
  assert.deepEqual(validateSet(set, known), []);
});
