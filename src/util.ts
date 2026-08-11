import fs from 'fs-extra';
import path from 'path';
import type { PackageJson } from 'types-package-json';

let packageJsonCache: PackageJson | undefined;
export const packageJson = (): PackageJson => {
  if (packageJsonCache) return packageJsonCache;
  packageJsonCache = fs.readJSONSync(path.resolve(process.cwd(), `package.json`));
  return packageJsonCache as PackageJson;
};

export const getVersion = (): string => {
  const { COMMIT_SHA } = process.env;
  let { version } = packageJson();
  if (COMMIT_SHA) version = `${version}#${COMMIT_SHA.substring(0, 8)}`;
  return version;
};

export const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Splits a string into its constituent words, stripping surrounding punctuation.
 */
export const extractWords = (text: string): string[] => {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((word) => word.length > 0);
};

const matchesWord = (text: string, word: string): boolean => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'iu').test(text);
};

/**
 * Case-insensitive whole-word search for any of `words` within `text`.
 */
export const containsAnyWord = (text: string, words: string[]): boolean => {
  return words.some((word) => matchesWord(text, word));
};

/**
 * Returns the subset of `words` that appear as whole words (case-insensitive) within `text`.
 */
export const findMatchedWords = (text: string, words: string[]): string[] => {
  return words.filter((word) => matchesWord(text, word));
};

/**
 * Capitalizes the first letter and appends a period if the text doesn't already end with
 * terminal punctuation. Purely cosmetic - never rejects a candidate sentence.
 */
export const normalizeSentence = (text: string): string => {
  if (!text) return text;
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]["')\]]*$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

/**
 * Words that (almost) always require a following word to form a grammatical sentence -
 * articles, possessive determiners, conjunctions, and prepositions. Used as a heuristic for
 * rejecting sentences that look cut off mid-clause.
 */
const DANGLING_END_WORDS = new Set([
  // Articles
  'a',
  'an',
  'the',
  // Possessive determiners
  'my',
  'your',
  'his',
  'her',
  'its',
  'our',
  'their',
  // Conjunctions
  'and',
  'but',
  'or',
  'nor',
  'so',
  'because',
  'although',
  'though',
  'while',
  'if',
  'unless',
  'until',
  'since',
  'as',
  'than',
  'whether',
  // Prepositions
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'from',
  'by',
  'about',
  'into',
  'onto',
  'upon',
  'over',
  'under',
  'between',
  'among',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'near',
  'via',
  'per',
]);

/**
 * Whether `text` ends on a word that (almost) always requires a follow-up word - a strong
 * signal the sentence was cut off mid-clause rather than actually finished.
 */
export const endsWithDanglingWord = (text: string): boolean => {
  const words = extractWords(text);
  const lastWord = words[words.length - 1]?.toLowerCase();
  return lastWord !== undefined && DANGLING_END_WORDS.has(lastWord);
};
