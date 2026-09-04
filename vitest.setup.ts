// Node 26 ships an experimental global `localStorage` that stays `undefined`
// unless the process was started with `--localstorage-file`. That global wins
// over the one happy-dom installs, so `window.localStorage` is undefined inside
// DOM tests and every component that persists a draft throws.
//
// Give DOM environments a real in-memory Storage instead. One instance per test
// file (setup files re-run per file), so drafts never leak between suites.
class MemoryStorage implements Storage {
  #entries = new Map<string, string>();

  get length() {
    return this.#entries.size;
  }

  key(index: number) {
    return Array.from(this.#entries.keys())[index] ?? null;
  }

  getItem(key: string) {
    return this.#entries.get(String(key)) ?? null;
  }

  setItem(key: string, value: string) {
    this.#entries.set(String(key), String(value));
  }

  removeItem(key: string) {
    this.#entries.delete(String(key));
  }

  clear() {
    this.#entries.clear();
  }
}

if (typeof window !== "undefined") {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    if (window[name]) continue;
    Object.defineProperty(window, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
