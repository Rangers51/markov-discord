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

/**
 * Case-insensitive whole-word search for any of `words` within `text`.
 */
export const containsAnyWord = (text: string, words: string[]): boolean => {
  return words.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'iu').test(text);
  });
};
