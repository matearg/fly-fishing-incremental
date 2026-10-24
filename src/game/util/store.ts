export interface SaveStore { read(): string | null; write(raw: string): void }

// Storage can throw (private mode, quota, blocked site data).
export function storeAt(key: string): SaveStore {
  return {
    read() { try { return localStorage.getItem(key) } catch { return null } },
    write(raw) { try { localStorage.setItem(key, raw) } catch { /* nothing to do; the next write retries */ } },
  }
}
