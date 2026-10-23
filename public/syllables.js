// Einfache Silbentrennung für die Silbenbögen unter Anfängerwörtern.
// Reicht für lautgetreue Wörter (Ma-ma, Lol-li, O-ma, Al-lee, Le-o).

const NUCLEI = ['aa', 'ee', 'oo', 'ie', 'ei', 'ai', 'au', 'eu', 'äu', 'a', 'e', 'i', 'o', 'u', 'ä', 'ö', 'ü', 'y'];
const UNITS = ['sch', 'ch', 'ck', 'qu', 'pf'];

function tokens(word) {
  const w = word.toLowerCase();
  const out = [];
  let i = 0;
  while (i < w.length) {
    const nuc = NUCLEI.find((n) => w.startsWith(n, i));
    if (nuc) {
      out.push({ text: word.slice(i, i + nuc.length), vowel: true });
      i += nuc.length;
      continue;
    }
    const unit = UNITS.find((u) => w.startsWith(u, i));
    const len = unit ? unit.length : 1;
    out.push({ text: word.slice(i, i + len), vowel: false });
    i += len;
  }
  return out;
}

export function syllables(word) {
  const t = tokens(word);
  const vowelIdx = t.map((x, i) => (x.vowel ? i : -1)).filter((i) => i >= 0);
  if (vowelIdx.length < 2) return [word];
  const cuts = [];
  for (let k = 0; k < vowelIdx.length - 1; k++) {
    const a = vowelIdx[k];
    const b = vowelIdx[k + 1];
    const consonants = b - a - 1;
    if (consonants === 0) cuts.push(b); // Le-o
    else if (consonants === 1) cuts.push(a + 1); // Ma-ma
    else cuts.push(b - 1); // Lol-li, Al-lee
  }
  const parts = [];
  let start = 0;
  for (const c of cuts) {
    parts.push(t.slice(start, c).map((x) => x.text).join(''));
    start = c;
  }
  parts.push(t.slice(start).map((x) => x.text).join(''));
  return parts.filter(Boolean);
}
