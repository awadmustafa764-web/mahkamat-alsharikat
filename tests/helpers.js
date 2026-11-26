import { readFileSync } from 'node:fs';

/** Load a fixture as a fresh deep copy so tests can mutate it. */
export function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}
