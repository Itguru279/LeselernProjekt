# Neue Wörter und Geschichten

Alle Inhalte stehen im Code und werden beim Start geladen. Nach einer Änderung: `npm test` ausführen, committen, pushen. GitHub baut ein neues Image.

## Wörter (`src/content/words.ts`)

```ts
nomen('Melone', '🍉'),   // Wort mit Bild: für "Wort und Bild" / "Bild und Wort"
name('Lina'),            // Name: für Blitzlesen und Wörterkette
wort('malt'),            // kleines Wort: für Blitzlesen und Wörterkette
```

Regeln, die die Tests prüfen:

- Jedes Wort und jedes Bild nur einmal.
- Nur Buchstaben (keine Bindestriche oder Ziffern).
- Ein Bild sollte eindeutig sein: Ein Kind muss es ohne Erklärung erkennen.

Ob ein Wort an einem Tag vorkommt, entscheidet allein der Prüfer: Es wird nur benutzt, wenn alle seine Laute freigeschaltet sind.

## Geschichten (`src/content/stories.ts`)

Eine Serie hat Folgen mit fortlaufender Nummer. Pro Tag wird von bis zu zwei Serien die nächste Folge angeboten, das Kind wählt eine. Nach der letzten Folge beginnt die Serie von vorn.

```ts
{
  series: 'lola',
  number: 5,
  title: 'Lola im Schnee',
  cover: '❄️',
  lines: [
    'Heute liegt [Schnee] auf der [Alm].',   // [..] = liest das Kind, wenn möglich
    '[Lola] [malt] im Schnee.',
  ],
  teaser: 'Was hat Lola gemalt?',            // Spannung für morgen
  question: {
    text: 'Wo ist Lola?',                     // wird vorgelesen
    options: [
      { img: '🏔️', label: 'Alm', correct: true },
      { img: '🏖️', label: 'Strand' },
      { img: '🏠', label: 'Haus' },
    ],
  },
},
```

Tipps:

- Möglichst viele Wörter in Klammern setzen. Was das Kind noch nicht lesen kann, wird automatisch grau und vorgelesen.
- Kurze Sätze, 5–8 Zeilen pro Folge.
- Jede Folge endet mit einer kleinen Frage nach vorn (`teaser`): Das ist die Belohnung für morgen.
- Eine Folge wird nur angeboten, wenn das Kind darin mindestens zwei Wörter selbst lesen kann.

Mit `npm run vorschau -- a,m,l,o,i,e,n,t 2026-11-01 7` siehst du, wie eine Folge bei einem bestimmten Lernstand aussieht (fett = liest das Kind).

## Serien je Buchstabenstufe (`src/content/stories-stufen.ts`)

Serien mit `level` (z. B. `level: 'u'`) werden erst angeboten, wenn dieser Buchstabe freigeschaltet ist. Hier gilt eine strengere Regel: **jedes** Wort in Klammern muss mit den Buchstaben bis einschließlich dieser Stufe (Reihenfolge `LETTER_ORDER` in `src/content/letters.ts`) lesbar sein, sonst schlägt `npm test` fehl. Vorsicht bei Lautgruppen: „Aua“ enthält `au`, „Lilie“ enthält `ie`, „Stern“ beginnt mit `St`.

## Sätze und Lernaufgaben (`src/content/letters.ts`)

- `SENTENCES`: kurzer Satz, richtiges Bild, zwei falsche Bilder, `level` wie oben.
- Laut-Hinweise (`say`, `tip`) je Buchstabe. Konsonanten als Laut („mmm“), nicht als Buchstabenname („em“).

Vorschau einer Lernrunde: `npm run vorschau -- a,m,l,o,i,e,u 2026-11-01 lernen:u`
