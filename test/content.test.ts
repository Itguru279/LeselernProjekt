import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../src/content/words.ts';
import { SERIES } from '../src/content/stories.ts';
import { segment, isDecodable, GRAPHEMES } from '../src/generator/graphemes.ts';
import { renderEpisode } from '../src/generator/story.ts';
import { STUFEN_SERIES } from '../src/content/stories-stufen.ts';
import { LETTER_ORDER, SENTENCES, lessonFor } from '../src/content/letters.ts';
import { wordsOf } from '../src/generator/graphemes.ts';

const upTo = (level: string) => LETTER_ORDER.slice(0, LETTER_ORDER.indexOf(level) + 1);
const bracketWords = (line: string) => [...line.matchAll(/\[([^\]]+)\]/g)].flatMap((m) => wordsOf(m[1]));

const ALL = GRAPHEMES.map((g) => g.id);

test('jedes Wort lässt sich zerlegen und mit allen Lauten lesen', () => {
  for (const w of WORDS) {
    assert.ok(segment(w.text), w.text);
    assert.ok(isDecodable(w.text, ALL), w.text);
  }
});

test('kein Wort und kein Bild doppelt', () => {
  const texts = WORDS.map((w) => w.text.toLowerCase());
  assert.equal(new Set(texts).size, texts.length, 'doppelte Wörter');
  const imgs = WORDS.filter((w) => w.img).map((w) => w.img);
  assert.equal(new Set(imgs).size, imgs.length, 'doppelte Bilder');
});

test('Geschichten: Klammern geschlossen, genau eine richtige Antwort, Folgen lückenlos', () => {
  for (const s of SERIES) {
    s.episodes.forEach((ep, i) => {
      assert.equal(ep.number, i + 1, `${s.id} Folge ${i + 1}`);
      for (const line of ep.lines) {
        assert.equal((line.match(/\[/g) ?? []).length, (line.match(/\]/g) ?? []).length, line);
      }
      assert.equal(ep.question.options.filter((o) => o.correct).length, 1, ep.title);
    });
  }
});

test('mit A M L O I E hat jede erste Folge genug Kind-Wörter', () => {
  const known = new Set(['a', 'm', 'l', 'o', 'i', 'e']);
  for (const s of SERIES.filter((x) => !x.level || x.level === 'e')) {
    const r = renderEpisode(s.episodes[0], s.title, known);
    assert.ok(r.childWords.length >= 4, `${s.id}: ${r.childWords.join(',')}`);
    for (const w of r.childWords) assert.ok(isDecodable(w, known), w);
  }
});

test('Klammer-Wörter mit unbekannten Lauten werden Vorlesetext', () => {
  const known = new Set(['a', 'm', 'l', 'o', 'i', 'e']);
  const ep = SERIES[1].episodes[0];
  const r = renderEpisode(ep, 'x', known);
  const allChild = r.lines.flat().filter((s) => s.child).map((s) => s.text).join(' ');
  assert.ok(!allChild.includes('See'));
  assert.ok(!allChild.includes('Da'));
});

test('je Buchstabenstufe ab E eine Serie mit 5 Folgen', () => {
  const levels = STUFEN_SERIES.map((s) => s.level);
  assert.deepEqual(levels, LETTER_ORDER.slice(LETTER_ORDER.indexOf('e')));
  for (const s of STUFEN_SERIES) assert.equal(s.episodes.length, 5, s.id);
  const ids = SERIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'doppelte Serien-IDs');
});

test('Stufen-Serien: jedes Klammer-Wort ist auf der eigenen Stufe lesbar', () => {
  for (const s of STUFEN_SERIES) {
    const known = upTo(s.level as string);
    for (const ep of s.episodes) {
      const words = ep.lines.flatMap(bracketWords);
      const bad = words.filter((w) => !isDecodable(w, known));
      assert.deepEqual(bad, [], `${s.id} Folge ${ep.number}`);
      assert.ok(words.length >= 6, `${s.id} Folge ${ep.number}: nur ${words.length} Kind-Wörter`);
      // Auf der eigenen Stufe wird nichts davon zum Vorlesetext
      const r = renderEpisode(ep, s.title, new Set(known));
      assert.equal(r.childWords.length, words.length, `${s.id} Folge ${ep.number}`);
    }
  }
});

test('Sätze sind auf ihrer Stufe lesbar und haben drei verschiedene Bilder', () => {
  for (const x of SENTENCES) {
    assert.ok(LETTER_ORDER.includes(x.level), x.text);
    const bad = wordsOf(x.text).filter((w) => !isDecodable(w, upTo(x.level)));
    assert.deepEqual(bad, [], x.text);
    assert.equal(new Set([x.img, ...x.wrong]).size, 3, x.text);
  }
  for (const level of LETTER_ORDER.slice(LETTER_ORDER.indexOf('e'))) {
    assert.ok(SENTENCES.some((x) => x.level === level), `kein Satz für Stufe ${level}`);
  }
});

test('jeder Laut hat einen Lerninhalt', () => {
  for (const g of GRAPHEMES) assert.ok(lessonFor(g.id), g.id);
});
