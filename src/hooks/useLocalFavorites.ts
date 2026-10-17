import { useEffect, useState } from "react";

const KEY = "prop-connect-favorites";
const EVENT = "prop-connect-favorites-changed";
function read(fallback: string[] = []): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || JSON.stringify(fallback));
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))] : [];
  } catch { return fallback; }
}

/** Device-local saves only; never writes to the application database. */
export function useLocalFavorites(id: string) {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return {
    ids,
    remove: (target: string) => {
      const next = read(ids).filter(value => value !== target);
      setIds(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); }
      catch { /* Removal remains local to this mounted view when storage is unavailable. */ }
    },
    saved: ids.includes(id),
    toggle: () => {
      const current = read(ids);
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      setIds(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); }
      catch { /* In-memory interaction remains available when browser storage is blocked. */ }
    },
  };
}
