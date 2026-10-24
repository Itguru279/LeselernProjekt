// Zeigt die Aufgaben eines Tages als Text an, ohne Server und Datenbank.
// Aufruf: npm run vorschau -- [buchstaben] [datum] [anzahl]
// Beispiel: npm run vorschau -- a,m,l,o,i,e 2026-10-24 7
// Lernaufgaben zu einem Buchstaben: npm run vorschau -- a,m,l,o,i,e,u 2026-10-24 lernen:u

import { generateDailySet, generateLesson, type Task } from '../src/generator/daily.ts';
import { labelOf } from '../src/generator/graphemes.ts';

const [lettersArg = 'a,m,l,o,i,e', dateArg, countArg = '7'] = process.argv.slice(2);
const known = lettersArg.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const date = dateArg ?? new Date().toISOString().slice(0, 10);

const lessonLetter = countArg.startsWith('lernen:') ? countArg.slice('lernen:'.length) : null;
const set = lessonLetter
  ? generateLesson({ userId: 1, date, letter: lessonLetter, known })
  : generateDailySet({ userId: 1, date, known, taskCount: Number(countArg), storyProgress: {} });

function describe(t: Task): string {
  switch (t.type) {
    case 'silben':
      return `Leserutsche: ${t.syllable}  (danach: ${t.more.join(', ')})`;
    case 'wort-bild':
      return `Welches Bild passt zu „${t.word}“?  ${t.options.map((o) => o.img + (o.correct ? '✓' : '')).join('  ')}`;
    case 'bild-wort':
      return `Welches Wort passt zu ${t.img}?  ${t.options.map((o) => o.word + (o.correct ? '✓' : '')).join(' / ')}`;
    case 'blitz':
      return `Blitzlesen: „${t.word}“ (Auswahl: ${t.options.join(' / ')})`;
    case 'wortkette':
      return `Wörterkette: ${t.words.join(' – ')}`;
    case 'buchstabe':
      return `Finde alle ${t.target.toUpperCase()} ${t.target}: ${t.grid.join(' ')}`;
    case 'laut':
      return `Neuer Buchstabe ${t.target}: „${t.say}“ (${t.img} ${t.word})`;
    case 'anlaut':
      return `Womit fängt es an? ${t.target.toUpperCase()}: ${t.options.map((o) => o.img + ' ' + o.word + (o.correct ? '✓' : '')).join('  ')}`;
    case 'satz':
      return `Satz lesen: „${t.text}“  ${t.options.map((o) => o.img + (o.correct ? '✓' : '')).join('  ')}`;
    case 'geschichte':
      return t.choices
        .map((c) => {
          const lines = c.lines.map((l) => '    ' + l.map((s) => (s.child ? `**${s.text}**` : s.text)).join(''));
          return `Geschichte „${c.seriesTitle}“, Folge ${c.number}: ${c.title}\n${lines.join('\n')}\n    Frage: ${c.question.text} ${c.question.options.map((o) => o.img + (o.correct ? '✓' : '')).join(' ')}\n    Morgen: ${c.teaser}`;
        })
        .join('\n\n  oder\n\n  ');
  }
}

console.log(`Aufgaben für ${date} mit den Buchstaben ${known.map(labelOf).join(' ')}`);
console.log(`(fett = liest das Kind selbst, Rest liest ein Erwachsener vor)\n`);
set.tasks.forEach((t, i) => console.log(`${i + 1}. ${describe(t)}\n`));
console.log(`Enthaltene Buchstaben: ${set.letters.map(labelOf).join(' ')}`);
