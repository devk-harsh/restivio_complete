import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../utils/errors";
// A small loader shared by read-only pages; stale responses never replace newer data.
export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const loadRef = useRef(loader);
  loadRef.current = loader;
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    loadRef
      .current()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  return { data, error, loading, reload };
}
