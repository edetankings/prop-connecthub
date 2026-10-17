import { useEffect, useState } from "react";

export function useBuyerResource<T>(loader: () => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData([]); setError(false); setLoading(true);
    void (async () => {
      try {
        const result = await loader();
        if (result.error) throw result.error;
        if (active) setData(result.data || []);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [loader, retry]);
  return { data, loading, error, retry: () => setRetry(value => value + 1) };
}
