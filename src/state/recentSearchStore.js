import { readStorage, writeStorage } from './storage.js';

const KEY = 'gasolineras2:recent-searches:v1';
const LIMIT = 8;

function all() {
  const value = readStorage(KEY, []);
  return Array.isArray(value) ? value.filter(Boolean).slice(0, LIMIT) : [];
}

function add(query) {
  const text = String(query || '').trim();
  if (text.length < 2) return all();
  const next = [text, ...all().filter((item) => item.toLowerCase() !== text.toLowerCase())].slice(0, LIMIT);
  writeStorage(KEY, next);
  return next;
}

function clear() {
  writeStorage(KEY, []);
  return [];
}

export const RecentSearchStore = { all, add, clear };
