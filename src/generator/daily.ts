// Erzeugt die täglichen Leseaufgaben eines Kindes.
// Regel Nummer 1: Alles, was das Kind selbst lesen soll, besteht nur aus
// Lauten, die es schon kennt. Am Ende prüft validateSet() das noch einmal.

import { WORDS, type Word } from '../content/words.ts';
import { SERIES } from '../content/stories.ts';
import { GRAPHEMES, capitalOf, graphemesIn, isDecodable, segment } from './graphemes.ts';
import { hashSeed, Rng } from './rng.ts';
import { renderEpisode, type RenderedEpisode } from './story.ts';

export type Task =
  | { type: 'silben'; consonant: string; vowel: string; syllable: string; more: string[] }
  | { type: 'wort-bild'; word: string; options: { img: string; correct: boolean }[] }
  | { type: 'bild-wort'; img: string; options: { word: string; correct: boolean }[] }
  | { type: 'blitz'; word: string; options: string[] }
  | { type: 'wortkette'; words: string[] }
  | { type: 'buchstabe'; target: string; grid: string[] }
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

const BASE_ORDER: TaskType[] = [
  'silben',
  'wort-bild',
  'bild-wort',
  'blitz',
  'wortkette',
  'buchstabe',
  'silben',
  'wort-bild',
  'bild-wort',
  'blitz',
];

export function clampTaskCount(n: number): number {
  if (!Number.isFinite(n)) return 7;
  return Math.min(MAX_TASKS, Math.max(MIN_TASKS, Math.round(n)));
}

export function generateDailySet(input: GenerateInput): DailySet {
  const known = new Set(input.known);
  const rng = new Rng(hashSeed(`${input.userId}|${input.date}|${input.version ?? 0}`));
  const newest = input.known[input.known.length - 1];
  const recent = new Set((input.recentWords ?? []).map((w) => w.toLowerCase()));
  const used = new Set<string>();

  const readable = WORDS.filter((w) => isDecodable(w.text, known));
  const readablePictures = readable.filter((w) => w.img);
  const allPictures = WORDS.filter((w) => w.img);

  // Gewichtung: neuester Laut zählt dreifach, kürzlich Gelesenes seltener,
  // innerhalb eines Tages möglichst keine Wiederholung.
  const weight = (w: Word): number => {
    let x = 1;
    if (newest && segment(w.text)?.includes(newest)) x *= 3;
    if (recent.has(w.text.toLowerCase())) x *= 0.4;
    if (used.has(w.text.toLowerCase())) x *= 0.05;
    return x;
  };
  const take = (pool: Word[]): Word => {
    const w = rng.weighted(pool, weight);
    used.add(w.text.toLowerCase());
    return w;
  };

  const vowels = VOWELS.filter((v) => known.has(v));
  const consonants = SIMPLE_CONSONANTS.filter((c) => known.has(c));

  const builders: Record<Exclude<TaskType, 'geschichte'>, () => Task | null> = {
    silben: () => {
      if (!vowels.length || !consonants.length) return null;
      const pickC = () =>
        rng.weighted(consonants, (c) => (c === newest ? 3 : 1));
      const pickV = () => rng.weighted(vowels, (v) => (v === newest ? 3 : 1));
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
    'wort-bild': () => {
      if (readablePictures.length < 1 || allPictures.length < 3) return null;
      const target = take(readablePictures);
      const others = rng
        .shuffle(allPictures.filter((w) => w.img !== target.img))
        .slice(0, 2)
        .map((w) => ({ img: w.img as string, correct: false }));
      return {
        type: 'wort-bild',
        word: target.text,
        options: rng.shuffle([{ img: target.img as string, correct: true }, ...others]),
      };
    },
    'bild-wort': () => {
      if (readablePictures.length < 1 || readable.length < 3) return null;
      const target = take(readablePictures);
      const distractors = similarWords(target.text, readable, rng).slice(0, 2);
      if (distractors.length < 2) return null;
      return {
        type: 'bild-wort',
        img: target.img as string,
        options: rng.shuffle([
          { word: target.text, correct: true },
          ...distractors.map((w) => ({ word: w, correct: false })),
        ]),
      };
    },
    blitz: () => {
      if (readable.length < 3) return null;
      const target = take(readable);
      const distractors = similarWords(target.text, readable, rng).slice(0, 2);
      if (distractors.length < 2) return null;
      return { type: 'blitz', word: target.text, options: rng.shuffle([target.text, ...distractors]) };
    },
    wortkette: () => {
      if (readable.length < 4) return null;
      const words: string[] = [];
      for (let i = 0; i < 12 && words.length < 5; i++) {
        const w = take(readable).text;
        if (!words.includes(w)) words.push(w);
      }
      return words.length >= 4 ? { type: 'wortkette', words } : null;
    },
    buchstabe: () => {
      const singles = input.known.filter((g) => g.length === 1 && g !== 'ß');
      if (!singles.length) return null;
      const target = rng.weighted(singles, (g) => (g === newest ? 3 : 1));
      const others = GRAPHEMES.map((g) => g.id).filter((id) => id.length === 1 && id !== target && id !== 'ß');
      const grid: string[] = [];
      const hits = 3 + rng.int(2);
      for (let i = 0; i < hits; i++) grid.push(rng.next() < 0.5 ? target.toUpperCase() : target);
      while (grid.length < 12) {
        const o = rng.pick(others);
        grid.push(rng.next() < 0.5 ? o.toUpperCase() : o);
      }
      return { type: 'buchstabe', target, grid: rng.shuffle(grid) };
    },
  };

  const story = buildStory(known, input.storyProgress);
  const count = clampTaskCount(input.taskCount);
  const slots = story ? count - 1 : count;

  const tasks: Task[] = [];
  let guard = 0;
  let i = 0;
  while (tasks.length < slots && guard < 60) {
    const type = BASE_ORDER[i % BASE_ORDER.length] as Exclude<TaskType, 'geschichte'>;
    i++;
    guard++;
    const t = builders[type]();
    if (t) tasks.push(t);
  }
  if (story) tasks.push(story);

  const set: DailySet = { date: input.date, tasks, letters: lettersOfTasks(tasks) };
  const problems = validateSet(set, input.known);
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

function buildStory(known: Set<string>, progress: Record<string, number>): Task | null {
  const choices: RenderedEpisode[] = [];
  for (const s of SERIES) {
    const done = progress[s.id] ?? 0;
    const nextNumber = (done % s.episodes.length) + 1; // nach der letzten Folge von vorn
    const ep = s.episodes.find((e) => e.number === nextNumber);
    if (!ep) continue;
    const rendered = renderEpisode(ep, s.title, known);
    if (rendered.childWords.length >= 2) choices.push(rendered);
  }
  if (!choices.length) return null;
  return { type: 'geschichte', choices: choices.slice(0, 2) };
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
