import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segment, isDecodable, graphemesIn } from '../src/generator/graphemes.ts';

test('zerlegt Mehrbuchstaben-Grapheme richtig', () => {
  assert.deepEqual(segment('Schaf'), ['sch', 'a', 'f']);
  assert.deepEqual(segment('Eule'), ['eu', 'l', 'e']);
  assert.deepEqual(segment('Biene'), ['b', 'ie', 'n', 'e']);
  assert.deepEqual(segment('Socke'), ['s', 'o', 'ck', 'e']);
  assert.deepEqual(segment('Mäuse'), ['m', 'äu', 's', 'e']);
});

test('st und sp am Wortanfang sind eigene Grapheme', () => {
  assert.deepEqual(segment('Stern'), ['st-', 'e', 'r', 'n']);
  assert.deepEqual(segment('Spinne'), ['sp-', 'i', 'n', 'n', 'e']);
  assert.deepEqual(segment('Nest'), ['n', 'e', 's', 't']);
});

test('lesbar nur mit bekannten Graphemen', () => {
  const known = ['a', 'm', 'l', 'o', 'i', 'e'];
  for (const w of ['Mama', 'Oma', 'Lama', 'Lolli', 'Emil', 'Allee', 'lila']) {
    assert.ok(isDecodable(w, known), w);
  }
  for (const w of ['Maus', 'Ei', 'Momo1', 'Tal', 'Stein', '']) {
    assert.ok(!isDecodable(w, known), w);
  }
  // s und t bekannt, aber die st-Regel noch nicht: "Stern" ist nicht lesbar
  assert.ok(!isDecodable('Stern', ['s', 't', 'e', 'r', 'n']));
  assert.ok(isDecodable('Stern', ['st-', 'e', 'r', 'n']));
});

test('graphemesIn liefert Inventar-Reihenfolge', () => {
  assert.deepEqual(graphemesIn(['Lama', 'Oma']), ['a', 'o', 'm', 'l']);
});
