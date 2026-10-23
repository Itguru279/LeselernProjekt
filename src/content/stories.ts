// Fortsetzungsgeschichten.
//
// Schreibweise: Wörter in [eckigen Klammern] soll das Kind selbst lesen.
// Der Rest wird von einem Erwachsenen (oder der Vorlesestimme) gelesen.
// Ein Wort in Klammern, das noch Laute enthält, die das Kind nicht kennt,
// wird automatisch zum Vorlese-Wort. So passt jede Folge zu jedem
// Lernstand: Je mehr Buchstaben das Kind kann, desto mehr liest es selbst.

export interface StoryQuestion {
  text: string; // wird vorgelesen
  options: { img: string; label: string; correct?: boolean }[];
}

export interface Episode {
  series: string;
  number: number;
  title: string;
  cover: string;
  lines: string[];
  teaser: string; // Ausblick auf morgen (Spannung als Belohnung)
  question: StoryQuestion;
}

export interface Series {
  id: string;
  title: string;
  cover: string;
  episodes: Episode[];
}

const lola: Series = {
  id: 'lola',
  title: 'Lola das Lama',
  cover: '🦙',
  episodes: [
    {
      series: 'lola',
      number: 1,
      title: 'Ein Lolli für Lola',
      cover: '🍭',
      lines: [
        'Hoch oben auf der [Alm] wohnt ein [Lama].',
        'Das Lama heißt [Lola].',
        'Lola mag Süßes. Am liebsten einen [Lolli]!',
        'Da kommt [Oma] den Berg herauf.',
        'Oma ruft: [Lola! Lola!]',
        'Oma hat etwas mitgebracht. Einen [lila] [Lolli]!',
        'Lola schmatzt: [Mmmm!]',
      ],
      teaser: 'Doch am nächsten Morgen ist der Lolli weg. Wer war das?',
      question: {
        text: 'Wer ist Lola?',
        options: [
          { img: '🦙', label: 'Lama', correct: true },
          { img: '👵', label: 'Oma' },
          { img: '🐭', label: 'Maus' },
        ],
      },
    },
    {
      series: 'lola',
      number: 2,
      title: 'Wo ist der Lolli?',
      cover: '🔍',
      lines: [
        '[Lola] sucht ihren [Lolli].',
        'Ist er bei [Mama]? Nein, [Mama] hat ihn nicht.',
        'Ist er bei [Oma]? [Nein]!',
        'Da kichert es hinter einem Felsen.',
        'Es ist [Momo], die kleine [Maus]!',
        '[Momo] hat den [Lolli] im Maul. Ups!',
      ],
      teaser: 'Was wird Lola jetzt tun?',
      question: {
        text: 'Wer hat den Lolli?',
        options: [
          { img: '🐭', label: 'Maus', correct: true },
          { img: '👵', label: 'Oma' },
          { img: '👩', label: 'Mama' },
        ],
      },
    },
    {
      series: 'lola',
      number: 3,
      title: 'Teilen macht froh',
      cover: '🤝',
      lines: [
        '[Momo] schaut ganz traurig.',
        'Momo sagt leise: [Tut] mir leid, [Lola].',
        'Lola überlegt. Dann [lacht] sie.',
        '[Lola] und [Momo] teilen den [Lolli].',
        'Ein Stück für [Lola], ein Stück für [Momo].',
        '[Alle] sind froh. [Oma] auch!',
      ],
      teaser: 'Morgen gibt es ein Fest auf der Alm.',
      question: {
        text: 'Wer lacht am Ende?',
        options: [
          { img: '🦙', label: 'Lama', correct: true },
          { img: '🐻', label: 'Bär' },
          { img: '🐟', label: 'Fisch' },
        ],
      },
    },
    {
      series: 'lola',
      number: 4,
      title: 'Das Fest auf der Alm',
      cover: '🎉',
      lines: [
        'Heute ist ein [Fest] auf der [Alm].',
        '[Lola] holt [Limo]. [Momo] holt eine [Melone].',
        '[Oma] bringt [Rosen] mit.',
        'Dann kommt [Mama] mit einer großen [Torte].',
        '[Alle] tanzen. [Lola] tanzt am [besten]!',
      ],
      teaser: 'Das war die erste Geschichte von Lola. Bald geht es weiter!',
      question: {
        text: 'Was bringt Momo mit?',
        options: [
          { img: '🍉', label: 'Melone', correct: true },
          { img: '🥤', label: 'Limo' },
          { img: '🌹', label: 'Rosen' },
        ],
      },
    },
  ],
};

const emil: Series = {
  id: 'emil',
  title: 'Emil der Frosch',
  cover: '🐸',
  episodes: [
    {
      series: 'emil',
      number: 1,
      title: 'Emil sucht Mama',
      cover: '🐸',
      lines: [
        'Am kleinen [See] wohnt ein Frosch.',
        'Der Frosch heißt [Emil].',
        'Emil sucht seine [Mama]. Er ruft: [Mama! Mama!]',
        'Da kommt [Mia] vorbei. Mia ist ein Mädchen.',
        'Mia fragt: Wo ist deine Mama, [Emil]?',
        'Emil zeigt auf die [Allee]. [Da] ist [Mama]!',
        '[Mama] und [Emil] quaken vor Freude.',
      ],
      teaser: 'Doch was glitzert da im Wasser?',
      question: {
        text: 'Wen sucht Emil?',
        options: [
          { img: '👩', label: 'Mama', correct: true },
          { img: '👵', label: 'Oma' },
          { img: '🦙', label: 'Lama' },
        ],
      },
    },
    {
      series: 'emil',
      number: 2,
      title: 'Der Glitzerstein',
      cover: '💎',
      lines: [
        'Im Wasser liegt etwas, das glitzert.',
        '[Emil] taucht hinab. [Mia] wartet am Ufer.',
        'Emil kommt mit einem Stein zurück. Er ist [lila]!',
        '[Mia] staunt: [Oh!] [So] schön!',
        'Ist das ein [Zauberstein]?',
      ],
      teaser: 'Was kann der lila Stein?',
      question: {
        text: 'Welche Farbe hat der Stein?',
        options: [
          { img: '🟣', label: 'lila', correct: true },
          { img: '🟢', label: 'grün' },
          { img: '🔴', label: 'rot' },
        ],
      },
    },
    {
      series: 'emil',
      number: 3,
      title: 'Der Stein kann sprechen',
      cover: '✨',
      lines: [
        'In der Nacht leuchtet der [lila] Stein.',
        'Er flüstert: [Emil!] [Mia!]',
        'Ich bin [Lilo], der Zauberstein.',
        '[Lilo] kann einen Wunsch erfüllen.',
        '[Mia] wünscht sich ein [Eis]. [Emil] wünscht sich eine [Melone].',
        'Plopp! Da sind [Eis] und [Melone]!',
      ],
      teaser: 'Aber Lilo hat noch ein Geheimnis …',
      question: {
        text: 'Was wünscht sich Mia?',
        options: [
          { img: '🍦', label: 'Eis', correct: true },
          { img: '🍉', label: 'Melone' },
          { img: '🍭', label: 'Lolli' },
        ],
      },
    },
    {
      series: 'emil',
      number: 4,
      title: 'Lilos Geheimnis',
      cover: '🌙',
      lines: [
        '[Lilo] ist traurig. Er vermisst sein Zuhause.',
        'Lilo wohnt eigentlich auf dem [Mond].',
        '[Emil] und [Mia] bauen eine [Rakete].',
        'Drei, zwei, eins, [los]!',
        'Die [Rakete] fliegt bis zum [Mond]. [Lilo] ist wieder daheim.',
        '[Lilo] [lacht]: Danke, [Emil]! Danke, [Mia]!',
      ],
      teaser: 'Das war die erste Geschichte von Emil. Bald geht es weiter!',
      question: {
        text: 'Wo wohnt Lilo?',
        options: [
          { img: '🌙', label: 'Mond', correct: true },
          { img: '☀️', label: 'Sonne' },
          { img: '🏠', label: 'Haus' },
        ],
      },
    },
  ],
};

export const SERIES: Series[] = [lola, emil];

export function findEpisode(series: string, number: number): Episode | undefined {
  return SERIES.find((s) => s.id === series)?.episodes.find((e) => e.number === number);
}
