import type { Episode, StoryQuestion } from '../content/stories.ts';
import { isDecodable } from './graphemes.ts';

export interface Segment {
  text: string;
  child: boolean; // true = das Kind liest selbst
}

export interface RenderedEpisode {
  series: string;
  seriesTitle: string;
  number: number;
  title: string;
  cover: string;
  lines: Segment[][];
  teaser: string;
  question: StoryQuestion;
  childWords: string[];
}

const TOKEN_RE = /\[([^\]]+)\]|([^[]+)/g;
const WORD_SPLIT_RE = /([A-Za-zÄÖÜäöüß]+)/;

/**
 * Wandelt eine Zeile mit [Kind-Wörtern] in Abschnitte um.
 * Jedes Wort in Klammern wird einzeln geprüft: nur lesbare Wörter
 * bleiben Kind-Wörter, alles andere wird Vorlesetext.
 */
export function renderLine(line: string, known: Set<string>): Segment[] {
  const out: Segment[] = [];
  const push = (text: string, child: boolean) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.child === child) last.text += text;
    else out.push({ text, child });
  };
  for (const m of line.matchAll(TOKEN_RE)) {
    if (m[2] !== undefined) {
      push(m[2], false);
      continue;
    }
    // Inhalt einer Klammer: Wörter einzeln prüfen. Satzzeichen und Leerzeichen
    // gehören zum Wort davor.
    const parts = m[1].split(WORD_SPLIT_RE);
    let prevChild = false;
    for (const part of parts) {
      if (!part) continue;
      if (/^[A-Za-zÄÖÜäöüß]+$/.test(part)) {
        prevChild = isDecodable(part, known);
        push(part, prevChild);
      } else {
        push(part, prevChild);
      }
    }
  }
  return out;
}

export function renderEpisode(ep: Episode, seriesTitle: string, known: Set<string>): RenderedEpisode {
  const lines = ep.lines.map((l) => renderLine(l, known));
  const childWords: string[] = [];
  for (const line of lines) {
    for (const seg of line) {
      if (seg.child) childWords.push(...(seg.text.match(/[A-Za-zÄÖÜäöüß]+/g) ?? []));
    }
  }
  return {
    series: ep.series,
    seriesTitle,
    number: ep.number,
    title: ep.title,
    cover: ep.cover,
    lines,
    teaser: ep.teaser,
    question: ep.question,
    childWords,
  };
}
