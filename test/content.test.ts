import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS } from '../src/content/words.ts';
import { SERIES } from '../src/content/stories.ts';
import { segment, isDecodable, GRAPHEMES } from '../src/generator/graphemes.ts';
import { renderEpisode } from '../src/generator/story.ts';

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
  for (const s of SERIES) {
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
