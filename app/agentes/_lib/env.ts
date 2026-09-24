import "server-only";

/**
 * Reads a JSON environment variable, forgiving common copy/paste mistakes:
 * surrounding quotes ('...' or "..."), stray spaces/new lines, and “smart” quotes.
 * Logs a clear message (visible in Vercel → Logs) if it still can't be read.
 */
export function readJsonEnv<T>(name: string, fallback: T): T {
  let raw = process.env[name];
  if (!raw) return fallback;
  raw = raw.replace(/^﻿/, "").trim();
  // Remove one layer of wrapping quotes, e.g. '[...]' or "[...]" or `[...]`
  const m = raw.match(/^(['"`])([\s\S]*)\1$/);
  if (m && /^[[{]/.test(m[2].trim())) raw = m[2].trim();
  // Word/WhatsApp sometimes turn " into “ ” — JSON needs straight quotes.
  raw = raw.replace(/[“”]/g, '"');
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`[portal] ${name} is not valid JSON and was ignored:`, (e as Error).message);
    return fallback;
  }
}
