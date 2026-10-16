// Saved runs and variants in localStorage ("shapewell_runs"). Works without storage.

import type { Shape } from './reshape';

const KEY = 'shapewell_runs';

export interface SavedRun {
  id: string;
  kind: 'run';
  date: string;
  profile: Shape;
  page: string;
  summary: Record<string, unknown>;
  reasons: string[];
}
export interface SavedVariant {
  id: string;
  kind: 'variant';
  date: string;
  profile: Shape;
  prompt: string;
  rule: { when: string; show: string; copy: string; button: string };
}
export type Entry = SavedRun | SavedVariant;

let memory: Entry[] = [];
let storageOk = true;

export function storageAvailable() {
  read();
  return storageOk;
}

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    storageOk = true;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    storageOk = false;
    return memory;
  }
}

function write(list: Entry[]) {
  memory = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    storageOk = true;
  } catch {
    storageOk = false;
  }
  document.dispatchEvent(new CustomEvent('shapewell:saved'));
}

export const list = () => read().sort((a, b) => b.date.localeCompare(a.date));

const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function saveRun(run: Omit<SavedRun, 'id' | 'kind' | 'date'>) {
  const entry: SavedRun = { id: id(), kind: 'run', date: new Date().toISOString(), ...run };
  write([entry, ...read()]);
  return entry;
}

export function saveVariant(v: Omit<SavedVariant, 'id' | 'kind' | 'date'>) {
  const entry: SavedVariant = { id: id(), kind: 'variant', date: new Date().toISOString(), ...v };
  write([entry, ...read()]);
  return entry;
}

export function remove(entryId: string) {
  const all = read();
  const gone = all.find((e) => e.id === entryId) || null;
  write(all.filter((e) => e.id !== entryId));
  return gone;
}

export function restore(entry: Entry) {
  const all = read().filter((e) => e.id !== entry.id);
  write([entry, ...all]);
}

export function download(entries: Entry[] = list(), name = 'shapewell-runs.json') {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
