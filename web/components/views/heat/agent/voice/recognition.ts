/* The browser's speech-to-text, typed locally: TypeScript's DOM lib does not ship it, and Chromium only has the prefixed name. */

interface RecognitionResult { readonly isFinal: boolean; readonly 0: { readonly transcript: string } }
interface RecognitionEvent { readonly results: ArrayLike<RecognitionResult> }

export interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionCtor = new () => Recognition;

export function createRecognition(): Recognition | null {
  const w = window as unknown as Record<'SpeechRecognition' | 'webkitSpeechRecognition', RecognitionCtor | undefined>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** One session's text so far, and how many of its words are settled (every word but a still-changing last one). */
export function readResults(e: RecognitionEvent): { text: string; settled: number } {
  const results = Array.from(e.results);
  const text = results.map((r) => r[0].transcript).join(' ');
  const words = splitWords(text);
  const lastFinal = results.at(-1)?.isFinal ?? false;
  return { text, settled: lastFinal ? words.length : Math.max(0, words.length - 1) };
}

export const splitWords = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);
