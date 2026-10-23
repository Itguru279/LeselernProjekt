// Grapheme: ein Schriftzeichen (oder eine Zeichengruppe) für einen Laut.
// Die App zählt Grapheme statt Buchstaben, weil z. B. "sch" oder "ei"
// eigens gelernt werden müssen, bevor Wörter damit lesbar sind.

export type GraphemeType = 'vokal' | 'dauerlaut' | 'verschlusslaut' | 'mehrgraphem' | 'sonderregel';

export interface Grapheme {
  id: string; // klein geschrieben, z. B. "m", "sch", "st-"
  label: string; // Anzeige, z. B. "Mm", "Sch sch", "St st"
  type: GraphemeType;
  // Beispielwort mit Bild für die Buchstaben-Ansicht
  example?: { word: string; img: string };
}

export const GRAPHEMES: Grapheme[] = [
  { id: 'a', label: 'Aa', type: 'vokal', example: { word: 'Affe', img: '🐒' } },
  { id: 'e', label: 'Ee', type: 'vokal', example: { word: 'Esel', img: '🫏' } },
  { id: 'i', label: 'Ii', type: 'vokal', example: { word: 'Igel', img: '🦔' } },
  { id: 'o', label: 'Oo', type: 'vokal', example: { word: 'Oma', img: '👵' } },
  { id: 'u', label: 'Uu', type: 'vokal', example: { word: 'Uhr', img: '⌚' } },
  { id: 'm', label: 'Mm', type: 'dauerlaut', example: { word: 'Maus', img: '🐭' } },
  { id: 'l', label: 'Ll', type: 'dauerlaut', example: { word: 'Lama', img: '🦙' } },
  { id: 'n', label: 'Nn', type: 'dauerlaut', example: { word: 'Nase', img: '👃' } },
  { id: 'r', label: 'Rr', type: 'dauerlaut', example: { word: 'Rose', img: '🌹' } },
  { id: 's', label: 'Ss', type: 'dauerlaut', example: { word: 'Sonne', img: '☀️' } },
  { id: 'f', label: 'Ff', type: 'dauerlaut', example: { word: 'Fisch', img: '🐟' } },
  { id: 'w', label: 'Ww', type: 'dauerlaut', example: { word: 'Wal', img: '🐳' } },
  { id: 'h', label: 'Hh', type: 'dauerlaut', example: { word: 'Hase', img: '🐰' } },
  { id: 'v', label: 'Vv', type: 'dauerlaut', example: { word: 'Vogel', img: '🐦' } },
  { id: 'j', label: 'Jj', type: 'dauerlaut', example: { word: 'Jojo', img: '🪀' } },
  { id: 't', label: 'Tt', type: 'verschlusslaut', example: { word: 'Tomate', img: '🍅' } },
  { id: 'd', label: 'Dd', type: 'verschlusslaut', example: { word: 'Dino', img: '🦕' } },
  { id: 'k', label: 'Kk', type: 'verschlusslaut', example: { word: 'Katze', img: '🐱' } },
  { id: 'b', label: 'Bb', type: 'verschlusslaut', example: { word: 'Ball', img: '⚽' } },
  { id: 'g', label: 'Gg', type: 'verschlusslaut', example: { word: 'Gabel', img: '🍴' } },
  { id: 'p', label: 'Pp', type: 'verschlusslaut', example: { word: 'Pilz', img: '🍄' } },
  { id: 'z', label: 'Zz', type: 'verschlusslaut', example: { word: 'Zebra', img: '🦓' } },
  { id: 'x', label: 'Xx', type: 'verschlusslaut', example: { word: 'Hexe', img: '🧙' } },
  { id: 'y', label: 'Yy', type: 'vokal', example: { word: 'Yak', img: '🐂' } },
  { id: 'c', label: 'Cc', type: 'verschlusslaut', example: { word: 'Clown', img: '🤡' } },
  { id: 'ä', label: 'Ää', type: 'vokal', example: { word: 'Bär', img: '🐻' } },
  { id: 'ö', label: 'Öö', type: 'vokal', example: { word: 'Löwe', img: '🦁' } },
  { id: 'ü', label: 'Üü', type: 'vokal', example: { word: 'Tür', img: '🚪' } },
  { id: 'ß', label: 'ß', type: 'dauerlaut', example: { word: 'Fuß', img: '🦶' } },
  { id: 'sch', label: 'Sch', type: 'mehrgraphem', example: { word: 'Schaf', img: '🐑' } },
  { id: 'ch', label: 'Ch', type: 'mehrgraphem', example: { word: 'Buch', img: '📖' } },
  { id: 'ei', label: 'Ei', type: 'mehrgraphem', example: { word: 'Eis', img: '🍦' } },
  { id: 'au', label: 'Au', type: 'mehrgraphem', example: { word: 'Auto', img: '🚗' } },
  { id: 'eu', label: 'Eu', type: 'mehrgraphem', example: { word: 'Eule', img: '🦉' } },
  { id: 'äu', label: 'Äu', type: 'mehrgraphem', example: { word: 'Mäuse', img: '🐁' } },
  { id: 'ie', label: 'ie', type: 'mehrgraphem', example: { word: 'Biene', img: '🐝' } },
  { id: 'ck', label: 'ck', type: 'mehrgraphem', example: { word: 'Socke', img: '🧦' } },
  { id: 'pf', label: 'Pf', type: 'mehrgraphem', example: { word: 'Apfel', img: '🍎' } },
  { id: 'qu', label: 'Qu', type: 'mehrgraphem', example: { word: 'Qualle', img: '🪼' } },
  { id: 'st-', label: 'St', type: 'sonderregel', example: { word: 'Stern', img: '⭐' } },
  { id: 'sp-', label: 'Sp', type: 'sonderregel', example: { word: 'Spinne', img: '🕷️' } },
];

export const GRAPHEME_IDS = new Set(GRAPHEMES.map((g) => g.id));

export function graphemeById(id: string): Grapheme | undefined {
  return GRAPHEMES.find((g) => g.id === id);
}

// Längste zuerst, damit "sch" vor "s" + "ch" erkannt wird.
const MULTI = ['sch', 'äu', 'ch', 'ei', 'au', 'eu', 'ie', 'ck', 'pf', 'qu'];

const LETTER_RE = /[a-zäöüß]/;

/**
 * Zerlegt ein Wort in Grapheme. Gibt null zurück, wenn das Wort Zeichen
 * enthält, die keine Buchstaben sind.
 * Sonderregel: "st" und "sp" am Wortanfang werden "scht"/"schp" gesprochen
 * und zählen deshalb als eigenes Graphem ("st-", "sp-").
 */
export function segment(word: string): string[] | null {
  const w = word.toLowerCase();
  if (w.length === 0) return null;
  const out: string[] = [];
  let i = 0;
  if (w.startsWith('st') || w.startsWith('sp')) {
    out.push(w.slice(0, 2) + '-');
    i = 2;
  }
  while (i < w.length) {
    const multi = MULTI.find((m) => w.startsWith(m, i));
    if (multi) {
      out.push(multi);
      i += multi.length;
      continue;
    }
    const ch = w[i];
    if (!LETTER_RE.test(ch)) return null;
    out.push(ch);
    i += 1;
  }
  return out;
}

/** Ist das Wort nur mit den bekannten Graphemen lesbar? */
export function isDecodable(word: string, known: Iterable<string>): boolean {
  const seg = segment(word);
  if (!seg) return false;
  const set = known instanceof Set ? (known as Set<string>) : new Set(known);
  return seg.every((g) => set.has(g));
}

/** Welche Grapheme kommen in den Wörtern vor (in Inventar-Reihenfolge)? */
export function graphemesIn(words: Iterable<string>): string[] {
  const found = new Set<string>();
  for (const w of words) {
    const seg = segment(w);
    if (seg) seg.forEach((g) => found.add(g));
  }
  return GRAPHEMES.map((g) => g.id).filter((id) => found.has(id));
}

/** Zerlegt einen Satz in Wörter (nur Buchstabenfolgen). */
export function wordsOf(text: string): string[] {
  return text.match(/[A-Za-zÄÖÜäöüß]+/g) ?? [];
}

/** Anzeige-Label für ein Graphem, z. B. "Mm". */
export function labelOf(id: string): string {
  return graphemeById(id)?.label ?? id;
}

/** Ein großer Anzeige-Buchstabe, z. B. "M" oder "Sch". */
export function capitalOf(id: string): string {
  const base = id.replace('-', '');
  return base.charAt(0).toUpperCase() + base.slice(1);
}
