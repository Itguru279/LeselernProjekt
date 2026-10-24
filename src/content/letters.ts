// Lerninhalte je Buchstabe: wie der Laut klingt und kurze Sätze.
//
// Die Lernaufgaben zu einem Buchstaben erscheinen erst, wenn der Buchstabe
// in der Buchstaben-Ansicht freigeschaltet ist. Sätze werden nur gezeigt,
// wenn jedes Wort darin aus bekannten Lauten besteht (Prüfer).

import { capitalOf, graphemeById } from '../generator/graphemes.ts';

/** Reihenfolge der Fibel (Flex und Flora), so wie Ben die Buchstaben lernt. */
export const LETTER_ORDER = ['a', 'm', 'l', 'o', 'i', 'e', 'u', 's', 'f', 'n', 'w', 'r', 't', 'p'];

export interface Lesson {
  id: string;
  say: string; // wird beim Antippen vorgelesen
  tip: string; // Hinweis für Erwachsene (grau)
  example: { word: string; img: string };
}

// Konsonanten werden als Laut gesprochen ("mmm"), nicht mit ihrem Namen ("em").
const CUSTOM: Record<string, { say: string; tip: string; example?: { word: string; img: string } }> = {
  a: { say: 'Aaa. A wie Affe.', tip: 'Mund weit auf: aaa.', example: { word: 'Affe', img: '🐒' } },
  m: { say: 'Mmm. M wie Maus.', tip: 'Lippen zu und summen: mmm (nicht „em“).' },
  l: { say: 'Lll. L wie Lama.', tip: 'Zunge oben an die Zähne: lll (nicht „el“).' },
  o: { say: 'Ooo. O wie Oma.', tip: 'Mund ganz rund: ooo.' },
  i: { say: 'Iii. I wie Igel.', tip: 'Breit lächeln: iii.' },
  e: { say: 'Eee. E wie Esel.', tip: 'Mund halb offen: eee.' },
  u: { say: 'Uuu. U wie Ufo.', tip: 'Lippen spitz wie zum Pusten: uuu.', example: { word: 'Ufo', img: '🛸' } },
  s: { say: 'Sss. S wie Sonne.', tip: 'Summen wie eine Biene: sss (nicht „es“).', example: { word: 'Sonne', img: '☀️' } },
  f: { say: 'Fff. F wie Fee.', tip: 'Oberzähne auf die Unterlippe und pusten: fff (nicht „ef“).', example: { word: 'Fee', img: '🧚' } },
  n: { say: 'Nnn. N wie Nase.', tip: 'Durch die Nase summen: nnn (nicht „en“).' },
  w: { say: 'Www. W wie Wal.', tip: 'Wie f, aber mit Stimme: www (nicht „we“).' },
  r: { say: 'Rrr. R wie Rose.', tip: 'Gurgeln oder schnurren: rrr (nicht „er“).' },
  t: { say: 'T. T wie Tomate.', tip: 'Ganz kurz mit der Zunge: t (nicht „te“).' },
  p: { say: 'P. P wie Pilz.', tip: 'Lippen zu und kurz plopp: p (nicht „pe“).' },
};

/** Lerninhalt für ein Graphem. Für Laute ohne eigenen Eintrag gibt es einen einfachen Ersatz. */
export function lessonFor(id: string): Lesson | null {
  const g = graphemeById(id);
  if (!g) return null;
  const c = CUSTOM[id];
  const example = c?.example ?? g.example ?? { word: capitalOf(id), img: '🔤' };
  return {
    id,
    say: c?.say ?? `${capitalOf(id)} wie ${example.word}.`,
    tip: c?.tip ?? `Laut vormachen, nicht den Buchstabennamen sagen.`,
    example,
  };
}

// ---------- Sätze ----------
// Das Kind liest den Satz und tippt auf das passende Bild.
// `level`: ab diesem Buchstaben (in LETTER_ORDER) ist der Satz lesbar. Die
// Tests prüfen das. Gezeigt wird er trotzdem nur, wenn der Prüfer zustimmt.

export interface Sentence {
  level: string;
  text: string;
  img: string; // richtiges Bild
  wrong: [string, string];
}

export const SENTENCES: Sentence[] = [
  { level: 'e', text: 'Lila Lolli', img: '🍭', wrong: ['🍦', '🍌'] },
  { level: 'e', text: 'Lila Limo', img: '🥤', wrong: ['🥛', '☕'] },
  { level: 'e', text: 'Oma Emma', img: '👵', wrong: ['👶', '🐶'] },
  { level: 'e', text: 'Lama Lola', img: '🦙', wrong: ['🐮', '🐷'] },
  { level: 'e', text: 'Mama Mia', img: '👩', wrong: ['👴', '🐱'] },

  { level: 'u', text: 'Muli Lulu', img: '🫏', wrong: ['🐟', '🐔'] },
  { level: 'u', text: 'Uli am Lolli', img: '🍭', wrong: ['🚲', '🍎'] },

  { level: 's', text: 'Sisi im Moos', img: '🐍', wrong: ['🐟', '🐦'] },
  { level: 's', text: 'Alles lila', img: '🟣', wrong: ['🟢', '🔴'] },
  { level: 't', text: 'Esel Sam isst Mais', img: '🌽', wrong: ['🍕', '🍌'] },
  { level: 's', text: 'Oma Elsa im Sessel', img: '👵', wrong: ['🐸', '🚗'] },

  { level: 'f', text: 'Fio im Ufo', img: '🛸', wrong: ['🚗', '🚲'] },
  { level: 'f', text: 'Affe Fio', img: '🐒', wrong: ['🐘', '🐢'] },
  { level: 'f', text: 'Fee Mila', img: '🧚', wrong: ['🧙', '🤖'] },

  { level: 'n', text: 'Sonne am See', img: '☀️', wrong: ['🌧️', '❄️'] },
  { level: 'n', text: 'Nimm Ananas!', img: '🍍', wrong: ['🍎', '🍓'] },
  { level: 'n', text: 'Nino im See', img: '🐬', wrong: ['🐄', '🐔'] },

  { level: 'w', text: 'Wolfi will Waffeln', img: '🧇', wrong: ['🍖', '🐟'] },
  { level: 'w', text: 'Wolfi in Wanne', img: '🛁', wrong: ['🛏️', '🚗'] },
  { level: 'w', text: 'Wellen am See', img: '🌊', wrong: ['🔥', '🌵'] },
  { level: 'w', text: 'Wal im See', img: '🐳', wrong: ['🐘', '🐿️'] },

  { level: 'r', text: 'Rufus am Roller', img: '🛴', wrong: ['🛏️', '🚀'] },
  { level: 'r', text: 'Rosen am Rasen', img: '🌹', wrong: ['🍄', '🌵'] },
  { level: 'r', text: 'Wurm im Rasen', img: '🪱', wrong: ['🐘', '🦅'] },
  { level: 'r', text: 'Wasser im Meer', img: '🌊', wrong: ['🏜️', '❄️'] },

  { level: 't', text: 'Tim malt', img: '🎨', wrong: ['🛌', '⚽'] },
  { level: 't', text: 'Tante Lotte mit Torte', img: '🎂', wrong: ['🍕', '🍔'] },
  { level: 't', text: 'Tomate ist rot', img: '🍅', wrong: ['🥒', '🍌'] },
  { level: 't', text: 'Ente im Wasser', img: '🦆', wrong: ['🐓', '🐕'] },
  { level: 't', text: 'Tor! Tor! Tor!', img: '⚽', wrong: ['🎻', '🛁'] },

  { level: 'p', text: 'Papa isst Pommes', img: '🍟', wrong: ['🍦', '🥕'] },
  { level: 'p', text: 'Tulpen am Fenster', img: '🌷', wrong: ['🌵', '🍄'] },
  { level: 'p', text: 'Suppe ist warm', img: '🍲', wrong: ['🍦', '🧊'] },
  { level: 'p', text: 'Pia mit Lupe', img: '🔍', wrong: ['✂️', '🎈'] },
  { level: 'p', text: 'Palme am Meer', img: '🌴', wrong: ['🌲', '🌵'] },
];
