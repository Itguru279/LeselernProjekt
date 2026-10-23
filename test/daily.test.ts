import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDailySet, validateSet, MIN_TASKS, MAX_TASKS } from '../src/generator/daily.ts';
import { GRAPHEMES } from '../src/generator/graphemes.ts';

const ORDER = ['a', 'm', 'l', 'o', 'i', 'e', 'u', 'n', 'r', 's', 't', 'f', 'w', 'h', 'd', 'ei', 'au', 'k', 'b', 'g', 'p', 'sch', 'ch', 'ie', 'eu', 'z', 'st-', 'sp-'];

test('alle Kind-Wörter sind lesbar, für viele Lernstände und Tage', () => {
  for (let n = 1; n <= ORDER.length; n++) {
    const known = ORDER.slice(0, n);
    for (let day = 1; day <= 12; day++) {
      const date = `2026-11-${String(day).padStart(2, '0')}`;
      for (const count of [5, 7, 10]) {
        const set = generateDailySet({ userId: 1, date, known, taskCount: count, storyProgress: { lola: day % 4, emil: (day + 1) % 4 } });
        assert.deepEqual(validateSet(set, known), [], `${known.join('')} ${date}`);
        assert.ok(set.tasks.length >= 1);
        assert.ok(set.tasks.length <= MAX_TASKS);
      }
    }
  }
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
