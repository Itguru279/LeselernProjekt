// Erzeugt die täglichen Leseaufgaben eines Kindes und die Lernaufgaben zu
// einem einzelnen Buchstaben.
// Regel Nummer 1: Alles, was das Kind selbst lesen soll, besteht nur aus
// Lauten, die es schon kennt. Am Ende prüft validateSet() das noch einmal.

import { WORDS, type Word } from '../content/words.ts';
import { SERIES } from '../content/stories.ts';
import { SENTENCES, lessonFor } from '../content/letters.ts';
import { GRAPHEMES, capitalOf, graphemesIn, isDecodable, segment, wordsOf } from './graphemes.ts';
import { hashSeed, Rng } from './rng.ts';
import { renderEpisode, type RenderedEpisode } from './story.ts';

export type Task =
  | { type: 'silben'; consonant: string; vowel: string; syllable: string; more: string[] }
  | { type: 'wort-bild'; word: string; options: { img: string; correct: boolean }[] }
  | { type: 'bild-wort'; img: string; options: { word: string; correct: boolean }[] }
  | { type: 'blitz'; word: string; options: string[] }
  | { type: 'wortkette'; words: string[] }
  | { type: 'buchstabe'; target: string; grid: string[] }
  | { type: 'laut'; target: string; say: string; tip: string; word: string; img: string }
  | { type: 'anlaut'; target: string; options: { img: string; word: string; correct: boolean }[] }
  | { type: 'satz'; text: string; options: { img: string; correct: boolean }[] }
  | { type: 'geschichte'; choices: RenderedEpisode[] };

export type TaskType = Task['type'];

export interface DailySet {
  date: string;
  tasks: Task[];
  letters: string[]; // Grapheme, die in den Aufgaben vorkommen
}

export interface GenerateInput {
  userId: number;
  date: string; // YYYY-MM-DD
  version?: number; // > 0, wenn der Tag neu erzeugt wird
  known: string[]; // freigeschaltete Grapheme in der Reihenfolge des Lernens
  taskCount: number; // 5 bis 10, inklusive Geschichte
  storyProgress: Record<string, number>; // Serie -> letzte fertige Folge
  recentWords?: string[]; // Wörter der letzten Tage, für Abwechslung
}

export const VOWELS = ['a', 'e', 'i', 'o', 'u'];
export const SIMPLE_CONSONANTS = ['m', 'l', 'n', 'r', 's', 'f', 'w', 'h', 'j', 't', 'd', 'k', 'b', 'g', 'p', 'z'];

export const MIN_TASKS = 5;
export const MAX_TASKS = 10;

// Übungen ohne Geschichte. "silben" kommt immer zuerst (leichter Einstieg),
// der Rest wird pro Tag gemischt.
const PRACTICE_TYPES = ['wort-bild', 'bild-wort', 'blitz', 'wortkette', 'buchstabe', 'anlaut', 'satz'] as const;
type PracticeType = 'silben' | (typeof PRACTICE_TYPES)[number];

export function clampTaskCount(n: number): number {
  if (!Number.isFinite(n)) return 7;
  return Math.min(MAX_TASKS, Math.max(MIN_TASKS, Math.round(n)));
}

// Laute, die sich am Wortanfang leicht verwechseln lassen. Bei der Aufgabe
// "Womit fängt es an?" kommen sie nicht zusammen vor.
const CONFUSABLE = [
  ['s', 'sch', 'st-', 'sp-', 'z', 'ß', 'c', 'ch'],
  ['f', 'v', 'pf', 'w'],
  ['k', 'c', 'ck', 'qu', 'g', 'ch'],
  ['t', 'd'],
  ['p', 'b', 'pf'],
  ['e', 'ä', 'ei', 'eu', 'äu'],
  ['a', 'au', 'ä', 'äu'],
  ['i', 'ie', 'y', 'j'],
  ['o', 'ö'],
  ['u', 'ü'],
];

function confusable(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.replace('-', '')[0] === b.replace('-', '')[0]) return true;
  return CONFUSABLE.some((group) => group.includes(a) && group.includes(b));
}

function firstGrapheme(word: string): string | undefined {
  return segment(word)?.[0];
}

interface BuilderOptions {
  known: string[];
  rng: Rng;
  focus?: string; // Lernaufgaben: dieser Laut muss vorkommen
  recent?: Set<string>;
}

/** Baut einzelne Aufgaben. Gibt null zurück, wenn es keine passenden Wörter gibt. */
function makeBuilders({ known: knownList, rng, focus, recent = new Set() }: BuilderOptions) {
  const known = new Set(knownList);
  const target = focus ?? knownList[knownList.length - 1]; // wird bevorzugt geübt
  const used = new Set<string>();

  const readableAll = WORDS.filter((w) => isDecodable(w.text, known));
  const hasFocus = (w: Word) => !focus || (segment(w.text)?.includes(focus) ?? false);
  const readable = readableAll.filter(hasFocus);
  const readablePictures = readable.filter((w) => w.img);
  const allPictures = WORDS.filter((w) => w.img);

  // Gewichtung: Zielaut zählt dreifach, kürzlich Gelesenes seltener,
  // innerhalb eines Tages möglichst keine Wiederholung.
  const weight = (w: Word): number => {
    let x = 1;
    if (target && segment(w.text)?.includes(target)) x *= 3;
    if (recent.has(w.text.toLowerCase())) x *= 0.4;
    if (used.has(w.text.toLowerCase())) x *= 0.05;
    return x;
  };
  const take = (pool: Word[]): Word => {
    const w = rng.weighted(pool, weight);
    used.add(w.text.toLowerCase());
    return w;
  };
  const prefer = (id: string) => (id === target ? 3 : 1);

  const vowels = VOWELS.filter((v) => known.has(v));
  const consonants = SIMPLE_CONSONANTS.filter((c) => known.has(c));

  return {
    silben(): Task | null {
      let cs = consonants;
      let vs = vowels;
      if (focus && VOWELS.includes(focus)) vs = [focus];
      else if (focus && SIMPLE_CONSONANTS.includes(focus)) cs = [focus];
      else if (focus) return null;
      if (!vs.length || !cs.length) return null;
      const pickC = () => rng.weighted(cs, prefer);
      const pickV = () => rng.weighted(vs, prefer);
      const consonant = pickC();
      const vowel = pickV();
      const syllable = capitalOf(consonant) + vowel;
      const more = new Set<string>();
      for (let i = 0; i < 20 && more.size < 3; i++) {
        const s = capitalOf(pickC()) + pickV();
        if (s !== syllable) more.add(s);
      }
      return { type: 'silben', consonant, vowel, syllable, more: [...more] };
    },

    'wort-bild'(): Task | null {
      if (readablePictures.length < 1 || allPictures.length < 3) return null;
      const t = take(readablePictures);
      const others = rng
        .shuffle(allPictures.filter((w) => w.img !== t.img))
        .slice(0, 2)
        .map((w) => ({ img: w.img as string, correct: false }));
      return {
        type: 'wort-bild',
        word: t.text,
        options: rng.shuffle([{ img: t.img as string, correct: true }, ...others]),
      };
    },

    'bild-wort'(): Task | null {
      if (readablePictures.length < 1 || readableAll.length < 3) return null;
      const t = take(readablePictures);
      const distractors = similarWords(t.text, readableAll, rng).slice(0, 2);
      if (distractors.length < 2) return null;
      return {
        type: 'bild-wort',
        img: t.img as string,
        options: rng.shuffle([
          { word: t.text, correct: true },
          ...distractors.map((w) => ({ word: w, correct: false })),
        ]),
      };
    },

    blitz(): Task | null {
      if (readable.length < 1 || readableAll.length < 3) return null;
      const t = take(readable);
      const distractors = similarWords(t.text, readableAll, rng).slice(0, 2);
      if (distractors.length < 2) return null;
      return { type: 'blitz', word: t.text, options: rng.shuffle([t.text, ...distractors]) };
    },

    wortkette(): Task | null {
      const min = focus ? 3 : 4;
      if (readable.length < min) return null;
      const words: string[] = [];
      for (let i = 0; i < 12 && words.length < 5; i++) {
        const w = take(readable).text;
        if (!words.includes(w)) words.push(w);
      }
      return words.length >= min ? { type: 'wortkette', words } : null;
    },

    buchstabe(): Task | null {
      const singles = (focus ? [focus] : knownList).filter((g) => g.length === 1 && g !== 'ß');
      if (!singles.length) return null;
      const letter = rng.weighted(singles, prefer);
      const others = GRAPHEMES.map((g) => g.id).filter((id) => id.length === 1 && id !== letter && id !== 'ß');
      const grid: string[] = [];
      const hits = 3 + rng.int(2);
      for (let i = 0; i < hits; i++) grid.push(rng.next() < 0.5 ? letter.toUpperCase() : letter);
      while (grid.length < 12) {
        const o = rng.pick(others);
        grid.push(rng.next() < 0.5 ? o.toUpperCase() : o);
      }
      return { type: 'buchstabe', target: letter, grid: rng.shuffle(grid) };
    },

    laut(): Task | null {
      const id = focus ?? target;
      const lesson = id ? lessonFor(id) : null;
      if (!lesson) return null;
      return { type: 'laut', target: id, say: lesson.say, tip: lesson.tip, word: lesson.example.word, img: lesson.example.img };
    },

    anlaut(): Task | null {
      // Welches Bild fängt mit dem Laut an? Das Kind liest nur den Buchstaben.
      const pool = focus ? [focus] : knownList.filter((g) => allPictures.some((w) => firstGrapheme(w.text) === g));
      if (!pool.length) return null;
      const letter = rng.weighted(pool, prefer);
      const hits = allPictures.filter((w) => firstGrapheme(w.text) === letter);
      const misses = allPictures.filter((w) => {
        const f = firstGrapheme(w.text);
        return f !== undefined && !confusable(f, letter);
      });
      if (!hits.length || misses.length < 2) return null;
      const right = take(hits);
      const wrong = rng.shuffle(misses).slice(0, 2);
      return {
        type: 'anlaut',
        target: letter,
        options: rng.shuffle([
          { img: right.img as string, word: right.text, correct: true },
          ...wrong.map((w) => ({ img: w.img as string, word: w.text, correct: false })),
        ]),
      };
    },

    satz(): Task | null {
      const pool = SENTENCES.filter(
        (s) =>
          !used.has('satz:' + s.text) &&
          wordsOf(s.text).every((w) => isDecodable(w, known)) &&
          (!focus || wordsOf(s.text).some((w) => segment(w)?.includes(focus))),
      );
      if (!pool.length) return null;
      const s = rng.weighted(pool, (x) => (target && wordsOf(x.text).some((w) => segment(w)?.includes(target)) ? 3 : 1));
      used.add('satz:' + s.text);
      return {
        type: 'satz',
        text: s.text,
        options: rng.shuffle([{ img: s.img, correct: true }, ...s.wrong.map((img) => ({ img, correct: false }))]),
      };
    },
  };
}

export function generateDailySet(input: GenerateInput): DailySet {
  const rng = new Rng(hashSeed(`${input.userId}|${input.date}|${input.version ?? 0}`));
  const recent = new Set((input.recentWords ?? []).map((w) => w.toLowerCase()));
  const builders = makeBuilders({ known: input.known, rng, recent });

  const story = buildStory(input.known, input.storyProgress);
  const count = clampTaskCount(input.taskCount);
  const slots = story ? count - 1 : count;

  const order: PracticeType[] = ['silben', ...rng.shuffle(PRACTICE_TYPES), ...rng.shuffle(PRACTICE_TYPES)];
  const tasks: Task[] = [];
  for (let guard = 0, i = 0; tasks.length < slots && guard < 60; guard++, i++) {
    const t = builders[order[i % order.length]]();
    if (t) tasks.push(t);
  }
  if (story) tasks.push(story);

  return checked({ date: input.date, tasks, letters: lettersOfTasks(tasks) }, input.known);
}

export interface LessonInput {
  userId: number;
  date: string;
  letter: string; // der Laut, um den es geht (muss bekannt sein)
  known: string[];
  round?: number; // "Noch eine Runde" erzeugt andere Aufgaben
}

/**
 * Lernaufgaben zu einem Buchstaben: Laut hören, Anlaut finden, Buchstaben
 * finden, Silben, Wörter und Sätze mit genau diesem Laut.
 */
export function generateLesson(input: LessonInput): DailySet {
  if (!input.known.includes(input.letter)) throw new Error('Buchstabe ist noch nicht freigeschaltet');
  const rng = new Rng(hashSeed(`lernen|${input.userId}|${input.date}|${input.letter}|${input.round ?? 0}`));
  const b = makeBuilders({ known: input.known, rng, focus: input.letter });
  const plan: (keyof typeof b)[] = ['laut', 'anlaut', 'buchstabe', 'silben', 'wort-bild', 'satz', 'bild-wort', 'wortkette', 'anlaut', 'blitz'];
  const tasks: Task[] = [];
  for (const type of plan) {
    if (tasks.length >= 8) break;
    const t = b[type]();
    if (t) tasks.push(t);
  }
  return checked({ date: input.date, tasks, letters: lettersOfTasks(tasks) }, input.known);
}

function checked(set: DailySet, known: string[]): DailySet {
  const problems = validateSet(set, known);
  if (problems.length) {
    throw new Error('Interner Fehler, nicht lesbare Wörter: ' + problems.join(', '));
  }
  return set;
}

/** Wörter, die dem Zielwort ähneln (gleicher Anfang oder ähnliche Länge). */
function similarWords(target: string, pool: Word[], rng: Rng): string[] {
  const t = target.toLowerCase();
  const candidates = [...new Set(pool.map((w) => w.text))].filter((w) => w.toLowerCase() !== t);
  const score = (w: string) => {
    const l = w.toLowerCase();
    let s = 0;
    if (l[0] === t[0]) s += 2;
    if (l[l.length - 1] === t[t.length - 1]) s += 1;
    s -= Math.abs(l.length - t.length) * 0.5;
    return s + rng.next(); // etwas Zufall
  };
  return candidates.sort((a, b) => score(b) - score(a));
}

/**
 * Welche Serien passen zum Lernstand? Serien mit Stufe erst, wenn deren
 * Buchstabe bekannt ist. Bevorzugt: noch nicht fertig gelesen, dann die
 * Stufe des zuletzt gelernten Buchstabens.
 */
export function eligibleSeries(knownList: string[], progress: Record<string, number>) {
  const known = new Set(knownList);
  return SERIES.map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.level || known.has(s.level))
    .map(({ s, i }) => {
      const done = progress[s.id] ?? 0;
      return { series: s, done, finished: done >= s.episodes.length, rank: s.level ? knownList.indexOf(s.level) : -1, i };
    })
    .sort((a, b) => Number(a.finished) - Number(b.finished) || b.rank - a.rank || a.i - b.i);
}

function buildStory(knownList: string[], progress: Record<string, number>): Task | null {
  const known = new Set(knownList);
  const choices: RenderedEpisode[] = [];
  for (const { series: s, done } of eligibleSeries(knownList, progress)) {
    if (choices.length >= 2) break;
    const nextNumber = (done % s.episodes.length) + 1; // nach der letzten Folge von vorn
    const ep = s.episodes.find((e) => e.number === nextNumber);
    if (!ep) continue;
    const rendered = renderEpisode(ep, s.title, known);
    if (rendered.childWords.length >= 2) choices.push(rendered);
  }
  if (!choices.length) return null;
  return { type: 'geschichte', choices };
}

/** Alle Wörter und Silben, die das Kind in einer Aufgabe selbst liest. */
export function childTextOf(task: Task): string[] {
  switch (task.type) {
    case 'silben':
      return [task.syllable, ...task.more];
    case 'wort-bild':
      return [task.word];
    case 'bild-wort':
      return task.options.map((o) => o.word);
    case 'blitz':
      return task.options;
    case 'wortkette':
      return task.words;
    case 'buchstabe':
      return [task.target];
    case 'laut':
    case 'anlaut':
      return [capitalOf(task.target)];
    case 'satz':
      return wordsOf(task.text);
    case 'geschichte':
      return task.choices.flatMap((c) => c.childWords);
  }
}

export function lettersOfTasks(tasks: Task[]): string[] {
  return graphemesIn(tasks.flatMap(childTextOf));
}

/** Gibt alle Wörter zurück, die das Kind lesen müsste, aber noch nicht kann. */
export function validateSet(set: DailySet, knownList: string[]): string[] {
  const known = new Set(knownList);
  const bad: string[] = [];
  for (const task of set.tasks) {
    for (const w of childTextOf(task)) {
      if (!isDecodable(w, known)) bad.push(`${task.type}:${w}`);
    }
  }
  return bad;
}
