import { test } from 'node:test';
import assert from 'node:assert/strict';

// Kleiner DOM-Ersatz, damit public/dom.js ohne Browser testbar ist.
class FakeNode {
  childNodes: FakeNode[] = [];
  append(...nodes: FakeNode[]) { this.childNodes.push(...nodes); }
  get textContent(): string { return this.childNodes.map((c) => c.textContent).join(''); }
}
class FakeText extends FakeNode {
  data: string;
  constructor(data: string) { super(); this.data = data; }
  override get textContent() { return this.data; }
}
class FakeElement extends FakeNode {
  className = '';
  attrs: Record<string, string> = {};
  tagName: string;
  constructor(tagName: string) { super(); this.tagName = tagName; }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  addEventListener() {}
}
Object.assign(globalThis, {
  Node: FakeNode,
  document: {
    createElement: (tag: string) => new FakeElement(tag),
    createTextNode: (s: string) => new FakeText(s),
  },
});

const { h } = await import('../public/dom.js');

test('verschachtelte Listen werden als Elemente eingefügt, nicht als Text', () => {
  // So baut "Satz lesen" den Satz: je Wort ein Paar [Wort, Leerzeichen]
  const words = ['Mama', 'malt.'].map((w) => [h('span', { class: 'w' }, w), ' ']);
  const el = h('div', { class: 'big-sentence' }, words);
  assert.equal(el.textContent, 'Mama malt. ');
  assert.ok(!el.textContent.includes('[object'));
  assert.equal(el.childNodes.filter((c: FakeNode) => c instanceof FakeElement).length, 2);
});

test('null und false werden übersprungen, Zahlen werden Text', () => {
  const el = h('p', {}, null, false, [3, [null, 'x']]);
  assert.equal(el.textContent, '3x');
});
