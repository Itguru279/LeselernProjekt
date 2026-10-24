// Geschichten je Buchstabenstufe (Fibel-Reihenfolge A M L O I E, dann
// U S F N W R T P). Jede Serie hat 5 Folgen.
//
// Strenge Regel für diese Serien: Jedes Wort in [Klammern] ist mit den
// Buchstaben bis einschließlich `level` lesbar. Die Tests prüfen das.
// Alles außerhalb der Klammern liest ein Erwachsener vor.

import type { Episode, Series } from './stories.ts';

type Opt = [img: string, label: string];

function folge(
  series: string,
  number: number,
  title: string,
  cover: string,
  lines: string[],
  teaser: string,
  question: string,
  right: Opt,
  wrong1: Opt,
  wrong2: Opt,
): Episode {
  return {
    series,
    number,
    title,
    cover,
    lines,
    teaser,
    question: {
      text: question,
      options: [
        { img: right[0], label: right[1], correct: true },
        { img: wrong1[0], label: wrong1[1] },
        { img: wrong2[0], label: wrong2[1] },
      ],
    },
  };
}

const ENDE = 'Das war die ganze Geschichte. Bald kommen neue Buchstaben und neue Abenteuer!';

// ---------- A M L O I E ----------
const mimi: Series = {
  id: 'mimi',
  title: 'Mimi, der lila Drache',
  cover: '🐉',
  level: 'e',
  episodes: [
    folge('mimi', 1, 'Ein lila Ei', '🥚', [
      'Auf der [Alm] liegt ein großes, [lila] Ei.',
      'Es wackelt. Es knackt. [Oma] [Emma] staunt.',
      'Heraus kommt ein kleiner Drache. Er ist ganz [lila]!',
      '[Oma] sagt: Du heißt [Mimi].',
      '[Mimi] piepst: [Mama]? [Mama]?',
      'Oma lacht: Ich bin [Oma] [Emma]. Ich passe auf dich auf.',
    ], 'Was frisst ein kleiner Drache wohl am liebsten?', 'Welche Farbe hat Mimi?', ['🟣', 'lila'], ['🟢', 'grün'], ['🔵', 'blau']),
    folge('mimi', 2, 'Mimi hat Hunger', '🥤', [
      '[Mimi] hat Hunger. Ihr Bauch grummelt: [Mmmm]!',
      '[Oma] [Emma] bringt Brot. Mimi mag kein Brot.',
      'Oma bringt einen Apfel. [Mimi] schüttelt den Kopf.',
      'Dann holt [Oma] eine [Limo]. Mimi trinkt alles aus.',
      'Hicks! Aus Mimis Nase kommt ein kleines [lila] Feuer!',
      'Oma kichert: [Limo] macht Drachenfeuer!',
    ], 'Morgen will Mimi fliegen lernen.', 'Was trinkt Mimi?', ['🥤', 'Limo'], ['🥛', 'Milch'], ['☕', 'Tee']),
    folge('mimi', 3, 'Mimi will fliegen', '🪽', [
      '[Mimi] will fliegen. Sie klettert auf einen Stein.',
      'Sie flattert mit den kleinen Flügeln. Plumps! Mimi landet im Gras.',
      'Da kommen [Leo] und [Mia] den Weg herauf.',
      '[Mia] ruft: Noch [mal], [Mimi]!',
      '[Leo] ruft: [Mimi]! [Mimi]! [Mimi]!',
      'Mimi flattert und flattert. Und dann fliegt sie! Hoch über die [Alm]!',
    ], 'Aber wo landet Mimi?', 'Wo landet Mimi beim ersten Mal?', ['🌱', 'Gras'], ['🌊', 'Wasser'], ['🌳', 'Baum']),
    folge('mimi', 4, 'Lolli an Lolli', '🍭', [
      '[Mimi] fliegt über die [Allee] bis ins Dorf.',
      'Da ist ein Laden. Im Fenster liegt [Lolli] an [Lolli].',
      'Mimi landet direkt vor dem Fenster. Bums!',
      'Der Verkäufer heißt [Ole]. Ole erschrickt: Ein Drache!',
      'Mimi zeigt auf einen [Lolli] und schaut ganz lieb.',
      '[Ole] lacht und schenkt ihr einen [lila] [Lolli].',
    ], 'Doch wo ist Oma Emma? Sie sucht Mimi überall!', 'Was schenkt Ole?', ['🍭', 'Lolli'], ['🍦', 'Eis'], ['🍌', 'Banane']),
    folge('mimi', 5, 'Alle auf der Alm', '🎆', [
      '[Oma] [Emma] sucht [Mimi]. Sie ruft: [Mimi]! [Mimi]!',
      'Da kommt [Mimi] geflogen. Mit [Ole], [Leo] und [Mia]!',
      '[Ole] hat [Limo] dabei, [Mia] hat [Lolli] für [alle].',
      '[Alle] feiern auf der [Alm].',
      '[Mimi] trinkt [Limo]. Hicks! Ein [lila] Feuerwerk!',
      '[Oma] [Emma] klatscht: [Mimi], [Mimi]!',
    ], ENDE, 'Was macht Mimi am Ende?', ['🎆', 'Feuerwerk'], ['😴', 'schlafen'], ['🏊', 'schwimmen']),
  ],
};

// ---------- + U ----------
const lulu: Series = {
  id: 'lulu',
  title: 'Lulu, das Muli',
  cover: '🫏',
  level: 'u',
  episodes: [
    folge('lulu', 1, 'Uli und Lulu', '🫏', [
      'In einem kleinen Dorf wohnt ein Junge. Er heißt [Uli].',
      '[Uli] hat ein [Muli]. Ein Muli ist halb Esel, halb Pferd.',
      'Das [Muli] heißt [Lulu].',
      '[Lulu] ist lieb, aber sehr stur.',
      'Uli sagt: Komm, [Lulu]! Aber Lulu bleibt stehen.',
      'Da holt [Uli] einen Apfel. Und schwupp, Lulu läuft los. [Ui]!',
    ], 'Wohin will Lulu so schnell?', 'Was hilft, damit Lulu losläuft?', ['🍎', 'Apfel'], ['🧸', 'Teddy'], ['🎈', 'Ballon']),
    folge('lulu', 2, 'Lulu läuft weg', '🌳', [
      '[Lulu] läuft und läuft. [Uli] rennt hinterher.',
      'Uli ruft: [Lulu]! [Lulu]! Bleib stehen!',
      'Lulu läuft bis zur alten [Ulme]. Das ist ein riesiger Baum.',
      'Unter der [Ulme] sitzt ein Mädchen. Sie heißt [Ulla].',
      '[Ulla] weint: Aua! Mein Fuß tut weh.',
      '[Lulu] stupst [Ulla] ganz sanft an.',
    ], 'Kann Lulu Ulla helfen?', 'Wer sitzt unter dem Baum?', ['👧', 'Ulla'], ['👵', 'Oma'], ['🐶', 'Hund']),
    folge('lulu', 3, 'Lulu hilft', '🏡', [
      '[Ulla] kann nicht mehr laufen.',
      '[Uli] hat eine Idee: [Ulla] reitet auf [Lulu]!',
      'Ulla klettert auf das [Muli]. [Ui], ist das hoch!',
      '[Lulu] trägt Ulla ganz vorsichtig nach Hause.',
      'An der Tür wartet die [Mama] von [Ulla]. Sie ist so froh!',
      '[Mama] sagt: Danke, [Lulu]! Danke, [Uli]!',
    ], 'Ullas Mama hat eine Überraschung für Lulu.', 'Worauf reitet Ulla?', ['🫏', 'Muli'], ['🚲', 'Fahrrad'], ['🚗', 'Auto']),
    folge('lulu', 4, 'Ein Kuchen für Lulu', '🥕', [
      '[Ulla] und ihre [Mama] haben etwas gebacken.',
      'Einen großen Kuchen für [Lulu]. Mit Möhren!',
      '[Lulu] schnuppert. [Mmmm]!',
      'Lulu frisst den ganzen Kuchen auf. Einfach [alle] Möhren!',
      '[Uli] lacht. [Ulla] lacht. [Mama] lacht.',
      'Dann legt sich [Lulu] unter die [Ulme] und schnarcht: [Iii-aaa].',
    ], 'In der Nacht hört Uli ein Geräusch im Stall.', 'Was ist im Kuchen?', ['🥕', 'Möhren'], ['🍓', 'Erdbeeren'], ['🍫', 'Schokolade']),
    folge('lulu', 5, 'Ein Geräusch in der Nacht', '🌙', [
      'In der Nacht wacht [Uli] auf. Im Stall raschelt es.',
      'Uli nimmt die Lampe und schleicht hin. [Uiii]!',
      'Neben [Lulu] liegt ein kleines Fohlen. Ein Mini-[Muli]!',
      'Am Morgen kommt [Ulla]. Sie flüstert: Es soll [Momo] heißen.',
      '[Lulu] leckt [Momo] ab. [Momo] wackelt mit den Ohren.',
      '[Lulu], [Momo], [Uli] und [Ulla]: [Alle] sind glücklich.',
    ], ENDE, 'Was liegt neben Lulu?', ['🐴', 'Fohlen'], ['🐱', 'Katze'], ['🐔', 'Huhn']),
  ],
};

// ---------- + S ----------
const sisi: Series = {
  id: 'sisi',
  title: 'Sisi, die Schlange',
  cover: '🐍',
  level: 's',
  episodes: [
    folge('sisi', 1, 'Wer liegt im Sessel?', '🛋️', [
      'Bei [Oma] [Elsa] im Wohnzimmer steht ein dicker [Sessel].',
      'Im [Sessel] liegt etwas Langes. Es zischt: [Sssss]!',
      'Es ist eine kleine Schlange. Sie heißt [Sisi].',
      '[Oma] [Elsa] staunt: [So], [so]! Wer bist du denn?',
      '[Sisi] gähnt: [Ssss]. Ich [muss] [mal] schlafen.',
      'Sie rollt sich ein. [Alles] ist still.',
    ], 'Wo kommt Sisi eigentlich her?', 'Wo liegt Sisi?', ['🛋️', 'Sessel'], ['🛏️', 'Bett'], ['🛁', 'Wanne']),
    folge('sisi', 2, 'Sisi sucht Mama', '🔎', [
      'Am Morgen ist [Sisi] traurig.',
      'Sisi sagt: Ich [muss] meine [Mama] suchen. [Mama] [Isa]!',
      '[Oma] [Elsa] und [Sisi] gehen [los].',
      'Sie fragen [Sami] am Kiosk. Sami sagt: [Mama] [Isa]? Am [See]!',
      'Am [See] ist aber nur ein [Esel].',
      'Der [Esel] sagt: [Iiaaa]! Ich weiß, wo sie ist!',
    ], 'Wohin führt der Esel?', 'Wer sagt I-aa?', ['🫏', 'Esel'], ['🐍', 'Schlange'], ['🦆', 'Ente']),
    folge('sisi', 3, 'Im Moos', '🌿', [
      'Der [Esel] führt sie in den Wald.',
      'Dort ist alles grün und weich. Das ist [Moos].',
      'Im [Moos] raschelt es: [Sssss]! [Sssss]!',
      'Da sind [alle] Geschwister von [Sisi]!',
      'Aber [Mama] [Isa] ist nicht dabei.',
      'Sisis Bruder [Sam] sagt: [Mama] ist [los]. Sie sucht [Sisi]!',
    ], 'Oh nein! Mama sucht Sisi, und Sisi sucht Mama!', 'Wo liegen die Schlangen?', ['🌿', 'Moos'], ['🏖️', 'Sand'], ['❄️', 'Schnee']),
    folge('sisi', 4, 'Wo ist Mama Isa?', '🏠', [
      '[Oma] [Elsa] hat eine Idee.',
      'Wir gehen nach Hause. [Mama] [Isa] sucht [Sisi] sicher [im] [Sessel]!',
      'Alle laufen [los]: [Oma], der [Esel], [Sisi] und [Sam].',
      'Zu Hause ist die Tür offen. Im [Sessel] liegt eine große Schlange.',
      'Das ist [Mama] [Isa]!',
      '[Sisi] ruft: [Mama]! Und Mama zischt froh: [Sisi]! [Sssss]!',
    ], 'Morgen gibt es ein Fest für alle.', 'Wo liegt Mama Isa?', ['🛋️', 'Sessel'], ['🌳', 'Baum'], ['🌊', 'Wasser']),
    folge('sisi', 5, 'Das Salami-Fest', '🎉', [
      '[Oma] [Elsa] macht ein Fest.',
      'Es gibt [Salami], [Mais] und [Limo].',
      'Der [Esel] mampft [Mais]. [Iiaaa]!',
      '[Sisi] und [Sam] teilen eine [Salami].',
      'Dann schlafen [alle] [im] [Sessel]: [Mama] [Isa], [Sisi] und [Sam].',
      'Und [Oma] [Elsa]? Die sitzt heute [mal] auf dem Sofa.',
    ], ENDE, 'Was frisst der Esel?', ['🌽', 'Mais'], ['🍕', 'Pizza'], ['🍌', 'Banane']),
  ],
};

// ---------- + F ----------
const fio: Series = {
  id: 'fio',
  title: 'Affe Fio im Ufo',
  cover: '🛸',
  level: 'f',
  episodes: [
    folge('fio', 1, 'Ein Ufo im Garten', '🛸', [
      'Es ist Nacht. [Lisa] schaut aus dem Fenster.',
      'Da blinkt etwas. Es landet im Garten. Ein [Ufo]!',
      'Die Tür vom [Ufo] geht auf. [Uiii]!',
      'Heraus kommt ein [Affe] mit einem Helm.',
      'Der [Affe] sagt: Ich bin [Fio]. Ich komme vom Mond.',
      '[Lisa] staunt: Ein [Affe] [im] [Ufo]!',
    ], 'Was will Fio auf der Erde?', 'Wer sitzt im Ufo?', ['🐒', 'Affe'], ['🐶', 'Hund'], ['🐸', 'Frosch']),
    folge('fio', 2, 'Fio hat Hunger', '🍌', [
      '[Fio] reibt sich den Bauch: [Mmmm], ich habe Hunger!',
      '[Lisa] holt [Mais] und [Salami]. Fio schüttelt den Kopf.',
      'Lisa holt eine Banane. Fio hüpft vor Freude: [Uiii]!',
      'Fio isst die Banane mit Schale. [Lisa] muss lachen.',
      'Dann setzt sich [Fio] auf das [Sofa]. Er findet einen Knopf.',
      'Klick! Der Fernseher geht an. Ein [Film]!',
    ], 'Welcher Film läuft wohl?', 'Was isst Fio am liebsten?', ['🍌', 'Banane'], ['🌽', 'Mais'], ['🍕', 'Pizza']),
    folge('fio', 3, 'Fio und die Fee', '🧚', [
      'Im [Film] tanzt eine [Fee]. Sie heißt [Mila].',
      '[Fio] ist ganz verliebt in die [Fee].',
      'Er ruft: [Fee] [Mila]! [Fee] [Mila]!',
      'Da wackelt der Fernseher. Und dann? Plopp!',
      'Die [Fee] steht [im] Wohnzimmer! Sie ist [so] klein wie ein Daumen.',
      '[Mila] lacht: [Fio], [Lisa]! Ich bleibe [elf] Minuten.',
    ], 'Was macht man in elf Minuten mit einer Fee?', 'Wie groß ist die Fee?', ['👍', 'wie ein Daumen'], ['🏠', 'wie ein Haus'], ['🌳', 'wie ein Baum']),
    folge('fio', 4, 'Elf Minuten', '🪄', [
      '[Fee] [Mila] hat einen Zauberstab.',
      'Sie zaubert: [Simsalami]!',
      'Auf dem Tisch liegen [elf] Bananen. Für [Fio]!',
      'Sie zaubert noch [mal]: [Simsalami]! Und [Lisa] schwebt bis an die Decke. [Uiii]!',
      'Dann ist es [so] weit. Die [elf] Minuten sind um.',
      '[Mila] winkt, und weg ist sie.',
    ], 'Aber Fio muss auch bald nach Hause …', 'Was hat Mila in der Hand?', ['🪄', 'Zauberstab'], ['🥄', 'Löffel'], ['✏️', 'Stift']),
    folge('fio', 5, 'Fio fliegt nach Hause', '🌙', [
      'Am Morgen piept das [Ufo]. [Fio] [muss] nach Hause.',
      '[Lisa] ist traurig. Und [Fio] [muss] weinen.',
      'Fio schenkt Lisa seinen Helm. Lisa schenkt Fio eine Banane für den Flug.',
      'Fio steigt ins [Ufo]. [Alles] blinkt.',
      'Dann fliegt das [Ufo] hoch bis zum Mond.',
      'Am Himmel blinkt es dreimal: [Lisa], [Lisa], [Lisa]! Das ist [Fio]!',
    ], ENDE, 'Wohin fliegt Fio?', ['🌙', 'Mond'], ['☀️', 'Sonne'], ['🏠', 'Haus']),
  ],
};

// ---------- + N ----------
const finn: Series = {
  id: 'finn',
  title: 'Finn und die Ananas-Insel',
  cover: '🏝️',
  level: 'n',
  episodes: [
    folge('finn', 1, 'Die Flaschenpost', '🍾', [
      'Am Strand findet [Finn] eine Flasche.',
      'In der Flasche ist ein Zettel. Darauf ist eine [Insel] gemalt. Und eine [Ananas].',
      'Finns Schwester [Nele] ruft: Eine Schatzkarte!',
      'Am Hafen steht ein [Seemann]. Er heißt [Nils].',
      '[Nils] sagt: Die [Ananas]-[Insel] kenne ich. [Nun] [los]!',
      '[Finn] und [Nele] steigen in sein Boot.',
    ], 'Was wartet auf der Ananas-Insel?', 'Was ist auf dem Zettel gemalt?', ['🍍', 'Ananas'], ['🐳', 'Wal'], ['⭐', 'Stern']),
    folge('finn', 2, 'Auf dem Meer', '⛵', [
      'Das Boot schaukelt. Die [Sonne] scheint.',
      '[Nele] hält die [Nase] in den Wind. [Mmmm], salzig!',
      'Da springt etwas aus dem Wasser. Ein Delfin!',
      'Der Delfin heißt [Nino]. [Nino] schwimmt neben dem Boot.',
      'Nino ruft: [Insel]! [Insel]!',
      'Und wirklich: Da vorne ist eine [Insel]. Mit [Ananas] überall.',
    ], 'Wer wohnt wohl auf der Insel?', 'Wer schwimmt neben dem Boot?', ['🐬', 'Delfin'], ['🦈', 'Hai'], ['🐙', 'Krake']),
    folge('finn', 3, 'Die Ananas-Insel', '🍍', [
      '[Finn], [Nele] und [Nils] gehen an Land.',
      'Der Sand ist heiß von der [Sonne].',
      'Überall wachsen [Ananas]. Und [Melonen]!',
      'Plötzlich fällt eine [Nuss] auf [Nils]. Aua!',
      'Oben im Baum sitzt ein [Affe] und kichert.',
      'Finn ruft: Komm runter, [Affe]!',
    ], 'Der Affe weiß, wo der Schatz ist.', 'Was fällt auf Nils?', ['🥜', 'Nuss'], ['🍍', 'Ananas'], ['⚽', 'Ball']),
    folge('finn', 4, 'Der Affe zeigt den Weg', '🐒', [
      'Der [Affe] heißt [Fanni]. [Fanni] springt von Baum zu Baum.',
      '[Finn], [Nele] und [Nils] laufen hinterher.',
      'Bei einem großen Stein bleibt [Fanni] stehen.',
      'Unter dem Stein ist ein Loch. Und [in] dem Loch: eine Kiste!',
      '[Nele] macht die Kiste auf. [Uiii]!',
      'In der Kiste liegen … [Ananas]-Bonbons!',
    ], 'Ist das wirklich der ganze Schatz?', 'Wer zeigt den Weg?', ['🐒', 'Affe'], ['🐬', 'Delfin'], ['🦜', 'Papagei']),
    folge('finn', 5, 'Der echte Schatz', '💛', [
      '[Nils] schmunzelt: [Ananas]-Bonbons!',
      'Unter den Bonbons liegt ein Brief.',
      'Nele liest vor: Der größte Schatz sind Freunde.',
      '[Finn] schaut [Nele] an. [Nele] schaut [Nils] an. Und [Fanni] schaut [Nino] an.',
      '[Alle] teilen die Bonbons. [Mmmm]!',
      'Dann fahren sie heim. Die [Sonne] geht unter.',
    ], ENDE, 'Was liegt unter den Bonbons?', ['✉️', 'Brief'], ['💰', 'Gold'], ['🔑', 'Schlüssel']),
  ],
};

// ---------- + W ----------
const wolfi: Series = {
  id: 'wolfi',
  title: 'Wolfi, der kleine Wolf',
  cover: '🐺',
  level: 'w',
  episodes: [
    folge('wolfi', 1, 'Wolfi mag Waffeln', '🧇', [
      'Im Wald wohnt ein kleiner [Wolf]. Er heißt [Wolfi].',
      'Nachts heulen alle Wölfe: [Uuuuu]!',
      'Wölfe mögen Fleisch. Aber [Wolfi] nicht.',
      'Wolfi mag nur eins: [Waffeln]!',
      'Seine [Mama] brummt: Ein [Wolf] isst keine [Waffeln]!',
      '[Wolfi] seufzt: [Wann] gibt es endlich [Waffeln]?',
    ], 'Morgen macht sich Wolfi auf die Suche nach Waffeln.', 'Was mag Wolfi?', ['🧇', 'Waffeln'], ['🍖', 'Fleisch'], ['🐟', 'Fisch']),
    folge('wolfi', 2, 'Der Waffel-Duft', '👃', [
      '[Wolfi] schnuppert. [Mmmm]! [Was] riecht da [so] gut?',
      'Der Duft kommt aus einem kleinen Haus [am] Waldrand.',
      'Wolfi schleicht hin. [Wo] ist die Tür?',
      'In der Küche steht [Oma] [Wilma]. Sie backt [Waffeln]!',
      'Wolfi drückt die [Nase] an das Fenster.',
      '[Oma] [Wilma] sieht ihn und erschrickt: Ein [Wolf]!',
    ], 'Läuft Oma Wilma weg? Oder Wolfi?', 'Wer backt Waffeln?', ['👵', 'Oma Wilma'], ['🐺', 'Wolfi'], ['🐻', 'Bär']),
    folge('wolfi', 3, 'Oma Wilma hat keine Angst', '😊', [
      '[Oma] [Wilma] macht das Fenster auf.',
      'Sie fragt: [Was] möchtest du, kleiner [Wolf]?',
      '[Wolfi] sagt ganz leise: Eine [Waffel], bitte.',
      'Oma Wilma lacht. Ein [Wolf], der [Waffeln] mag!',
      'Sie gibt [Wolfi] eine [Waffel]. Mit Sahne!',
      'Wolfi wedelt mit dem Schwanz wie ein Hund.',
    ], 'Aber dann hört Wolfi seine Mama heulen.', 'Hat Oma Wilma Angst?', ['😊', 'nein'], ['😱', 'ja, ganz doll'], ['😴', 'sie schläft']),
    folge('wolfi', 4, 'Mama Wolf sucht Wolfi', '🌲', [
      'Im Wald heult [Mama] [Wolf]: [Uuuuu]! [Wo] bist du, [Wolfi]?',
      'Wolfi läuft schnell zurück in den Wald.',
      'Er hat noch eine [Waffel] im Maul.',
      '[Mama] [Wolf] schnuppert. [Was] ist das?',
      'Sie beißt ab. [Mmmm]!',
      '[Mama] [Wolf] staunt: [Waffeln] sind ja lecker!',
    ], 'Morgen bringen die Wölfe Oma Wilma etwas mit.', 'Wer heult im Wald?', ['🐺', 'Mama Wolf'], ['🦉', 'Eule'], ['🐶', 'Hund']),
    folge('wolfi', 5, 'Das Waffel-Fest', '🎉', [
      '[Wolfi] und [Mama] [Wolf] gehen zu [Oma] [Wilma].',
      'Sie bringen einen Korb mit Pilzen und Beeren.',
      '[Oma] [Wilma] backt [Waffeln], [Waffeln], [Waffeln].',
      'Bald kommen [alle] Wölfe aus dem Wald. [Uuuuu]!',
      'Alle sitzen [im] Garten. [Was] für ein Fest!',
      'Seitdem gibt es im Wald jeden Sonntag [Waffeln].',
    ], ENDE, 'Was bringen die Wölfe mit?', ['🍄', 'Pilze'], ['🍕', 'Pizza'], ['🎁', 'Geschenk']),
  ],
};

// ---------- + R ----------
const rufus: Series = {
  id: 'rufus',
  title: 'Rufus und der Roller',
  cover: '🛴',
  level: 'r',
  episodes: [
    folge('rufus', 1, 'Rufus fährt Roller', '🐶', [
      'Das ist [Rufus]. Rufus ist ein Hund.',
      '[Rufus] hat einen [Roller]. Einen roten [Roller].',
      '[Rufus] fährt [rum] und [rum] und [rum].',
      'Er bellt vor Freude: Wuff! [Rrrrr]!',
      'Da kommt [Rosa]. Rosa ist die Freundin von [Rufus].',
      'Rosa ruft: [Rufus], [Rufus]! Fahr nicht [so] schnell!',
    ], 'Ob Rufus auf Rosa hört?', 'Womit fährt Rufus?', ['🛴', 'Roller'], ['🚲', 'Fahrrad'], ['🚗', 'Auto']),
    folge('rufus', 2, 'Rufus rast', '💨', [
      'Aber [Rufus] fährt immer schneller.',
      'Er rast über den [Rasen]. Er rast an den [Rosen] vorbei.',
      'Da liegt ein [Wurm] auf dem Weg!',
      'Rufus bremst. Quietsch! Der [Roller] kippt um.',
      '[Rufus] fliegt mitten in die [Rosen]. Aua! Aua!',
      'Der [Wurm] schaut und sagt: [Na], [na], [na].',
    ], 'Wer hilft Rufus aus den Rosen?', 'Was liegt auf dem Weg?', ['🪱', 'Wurm'], ['🐌', 'Schnecke'], ['🐞', 'Käfer']),
    folge('rufus', 3, 'Rosa hilft', '🌹', [
      '[Rosa] kommt angelaufen: [Rufus]!',
      'Sie zieht Rufus aus den [Rosen]. Er hat [Rosen] [im] Fell.',
      'Rosa pustet auf seine [Nase].',
      'Der [Wurm] heißt [Romi]. Romi sagt: Langsam ist schöner.',
      '[Rufus] nickt. Er fährt ab jetzt langsam.',
      'Rosa sagt: Morgen fahren wir zusammen [ans] [Meer].',
    ], 'Morgen geht es ans Meer!', 'Wo landet Rufus?', ['🌹', 'in den Rosen'], ['🌊', 'im Wasser'], ['🌳', 'im Baum']),
    folge('rufus', 4, 'Am Meer', '🏖️', [
      '[Rufus], [Rosa] und [Romi] fahren [ans] [Meer].',
      'Ganz langsam. [Romi] sitzt vorne auf dem [Roller].',
      'Am [Meer] ist es [warm]. Die [Sonne] scheint.',
      'Rufus springt ins [Wasser]. Platsch!',
      '[Rosa] baut eine Sandburg. [Romi] gräbt ein Loch.',
      'Plötzlich bellt Rufus: [Rrrrr]! Da, [im] [Wasser]!',
    ], 'Was hat Rufus im Wasser gesehen?', 'Wie ist es am Meer?', ['☀️', 'warm'], ['❄️', 'eiskalt'], ['🌧️', 'regnerisch']),
    folge('rufus', 5, 'Die blaue Murmel', '🔵', [
      'Im [Wasser] glitzert etwas.',
      '[Rufus] taucht und holt es mit dem Maul heraus.',
      'Es ist eine [Murmel]. Eine blaue [Murmel], so blau wie das [Meer].',
      'Rufus schenkt [Rosa] die [Murmel].',
      'Rosa strahlt: Danke, [Rufus]!',
      'Dann fahren [alle] heim. Langsam. Und [Romi] winkt vom [Roller].',
    ], ENDE, 'Was findet Rufus im Wasser?', ['🔵', 'Murmel'], ['🐚', 'Muschel'], ['⭐', 'Seestern']),
  ],
};

// ---------- + T ----------
const toni: Series = {
  id: 'toni',
  title: 'Ritter Toni',
  cover: '🏰',
  level: 't',
  episodes: [
    folge('toni', 1, 'Ritter Toni', '🛡️', [
      'In einem [Turm] wohnt ein [Ritter]. Er heißt [Toni].',
      '[Toni] ist ein [toller] [Ritter]. Aber seine Rüstung hat [Rost].',
      'Wenn er läuft, quietscht es: [Iiiiii]!',
      '[Toni] hat ein [Ross]. Das [Ross] heißt [Tilo].',
      '[Tante] [Lotte] ruft vom [Tor]: [Toni]! [Toni]! Komm [mal] her!',
      '[Tante] [Lotte] hat einen Brief vom König.',
    ], 'Was steht wohl im Brief?', 'Wo wohnt Toni?', ['🏰', 'im Turm'], ['🏠', 'im Haus'], ['⛺', 'im Zelt']),
    folge('toni', 2, 'Der Brief vom König', '✉️', [
      '[Tante] [Lotte] liest vor: Lieber [Ritter] [Toni]!',
      'Im Wald wohnt ein Drache. Er [ist] traurig.',
      'Bitte hilf ihm! Dein König.',
      '[Toni] setzt den Helm auf. Er [ist] mutig.',
      'Er steigt auf [Tilo]: [Los], [Tilo], [los]!',
      'Quietsch, quietsch, macht die Rüstung. [Tante] [Lotte] winkt.',
    ], 'Warum ist der Drache traurig?', 'Worauf reitet Toni?', ['🐴', 'Ross'], ['🐉', 'Drache'], ['🐮', 'Kuh']),
    folge('toni', 3, 'Der traurige Drache', '🐉', [
      '[Toni] und [Tilo] reiten tief in den Wald.',
      'Da sitzt der Drache unter einem [Ast]. Er weint.',
      'Dicke Tränen tropfen auf den Boden.',
      '[Toni] fragt: [Warum] weinst du?',
      'Der Drache schnieft: Mein Feuer ist aus.',
      'Ein Drache ohne Feuer! Jetzt lachen mich [alle] aus.',
    ], 'Kann Toni dem Drachen helfen?', 'Was fehlt dem Drachen?', ['🔥', 'Feuer'], ['🍰', 'Kuchen'], ['👑', 'Krone']),
    folge('toni', 4, 'Die rote Tomate', '🍅', [
      '[Toni] überlegt. Dann hat er eine Idee.',
      'Er holt eine [Tomate] aus der Tasche. Eine scharfe, [rote] [Tomate].',
      'Der Drache isst die [Tomate]. Er wird [rot]. [Rot] wie eine [Tomate].',
      'Dann hustet er. Und hustet. Und dann …',
      '[Fffff]! Eine riesige [Flamme]!',
      '[Toni] ruft: [Toll]! Der Drache tanzt vor Freude.',
    ], 'Aber Vorsicht, Toni steht direkt vor der Flamme!', 'Was isst der Drache?', ['🍅', 'Tomate'], ['🍎', 'Apfel'], ['🥕', 'Möhre']),
    folge('toni', 5, 'Ein Fest im Turm', '🎂', [
      'Hopp! [Toni] springt zur Seite. Nur sein [Mantel] [ist] jetzt [warm].',
      'Der Drache sagt: Danke, [Ritter] [Toni]!',
      'Zurück [im] [Turm] backt [Tante] [Lotte] eine [Torte].',
      'Der Drache macht den [Ofen] heiß. Mit seinem Feuer!',
      '[Toni], [Tilo], [Tante] [Lotte] und der Drache essen [alle] [Torte].',
      'Und der Drache ist nie wieder traurig.',
    ], ENDE, 'Was backt Tante Lotte?', ['🎂', 'Torte'], ['🍕', 'Pizza'], ['🍞', 'Brot']),
  ],
};

// ---------- + P ----------
const pit: Series = {
  id: 'pit',
  title: 'Opa Pit, der Pirat',
  cover: '🦜',
  level: 'p',
  episodes: [
    folge('pit', 1, 'Opa Pit', '☠️', [
      '[Pia] hat einen [Opa]. [Opa] [Pit].',
      '[Opa] [Pit] war früher ein [Pirat]!',
      'Er hat noch seinen [Piraten]-Hut und einen Papagei.',
      'Der Papagei heißt [Polli]. [Polli] krächzt: [Opa] [Pit]! [Opa] [Pit]!',
      'Heute holt [Opa] eine alte Kiste vom Dachboden.',
      'In der Kiste liegt ein [Plan]. Ein [Piraten]-[Plan]!',
    ], 'Wohin führt der Piraten-Plan?', 'Was war Opa Pit früher?', ['☠️', 'Pirat'], ['🚒', 'Feuerwehrmann'], ['🚜', 'Bauer']),
    folge('pit', 2, 'Der Plan', '🗺️', [
      '[Pia] schaut sich den [Plan] mit der [Lupe] an.',
      'Da [ist] eine [Insel]. Mit einer [Palme].',
      'Und unter der [Palme] [ist] ein rotes Kreuz.',
      '[Opa] [Pit] ruft: Da [ist] der Schatz!',
      '[Polli] krächzt: [Pommes]! [Pommes]!',
      '[Opa] und [Pia] packen ein: [Suppe], [Pommes] und die [Lupe].',
    ], 'Morgen segeln sie los!', 'Was ist unter der Palme gemalt?', ['❌', 'ein Kreuz'], ['⭐', 'ein Stern'], ['❤️', 'ein Herz']),
    folge('pit', 3, 'Sturm auf dem Meer', '🌊', [
      '[Opa] [Pit] [ist] wieder [Pirat]. Er steht am Steuer.',
      '[Pia] passt auf den [Plan] auf. [Polli] sitzt oben [im] [Mast].',
      'Plötzlich kommen [Wellen]. Riesige [Wellen]!',
      'Das Schiff schaukelt. [Pia] wird ganz blass.',
      '[Opa] [Pit] hält das Steuer fest. [Toll], [Opa]!',
      'Dann wird es still. Und da [ist] die [Insel]!',
    ], 'Ist der Schatz wirklich unter der Palme?', 'Was gibt es auf dem Meer?', ['🌊', 'Wellen'], ['🔥', 'Feuer'], ['❄️', 'Schnee']),
    folge('pit', 4, 'Unter der Palme', '🌴', [
      '[Pia], [Opa] [Pit] und [Polli] gehen an Land.',
      'Da [ist] die [Palme]! [Opa] [Pit] gräbt und gräbt.',
      'Er findet eine [Puppe]. Eine alte [Puppe] mit einem [Piraten]-Hut.',
      'Opa Pit wird ganz still: Das [ist] meine [Puppe]! Von früher!',
      'Die hat mein [Papa] hier versteckt. Vor vielen Jahren.',
      '[Pia] staunt: Ein [Piraten]-[Opa] mit einer [Puppe]!',
    ], 'Aber in der Puppe klappert etwas …', 'Was findet Opa Pit?', ['🪆', 'Puppe'], ['💎', 'Edelstein'], ['🍌', 'Banane']),
    folge('pit', 5, 'Der Schatz in der Puppe', '🖼️', [
      '[Pia] schüttelt die [Puppe]. Klapper, klapper.',
      'Im Bauch der [Puppe] [ist] eine kleine Dose.',
      'In der Dose [ist] ein Foto: [Opa] [Pit] als kleiner Junge. Mit seinem [Papa].',
      '[Opa] [Pit] wischt sich eine Träne weg.',
      'Er sagt: Das [ist] der [tollste] Schatz.',
      'Zu Hause gibt es [Pommes] für [alle]. Auch für [Polli]!',
    ], 'Das war die ganze Geschichte. Du kannst jetzt schon ganz viele Buchstaben!', 'Was ist in der Dose?', ['🖼️', 'Foto'], ['💰', 'Gold'], ['🍪', 'Keks']),
  ],
};

export const STUFEN_SERIES: Series[] = [mimi, lulu, sisi, fio, finn, wolfi, rufus, toni, pit];
