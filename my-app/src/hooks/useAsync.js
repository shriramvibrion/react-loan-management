import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Generic async data-fetching hook. Eliminates repeated try/catch/loading/error
 * patterns across pages.
 *
 * Usage:
 *   const { data, loading, error, run } = useAsync(fetchUserLoans);
 *   useEffect(() => { run(userEmail); }, [run, userEmail]);
 */
export default function useAsync(asyncFn, { immediate = false, args = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (...callArgs) => {
      setLoading(true);
      setError("");
      try {
        const result = await asyncFn(...callArgs);
        if (mountedRef.current) {
          setData(result);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || "An error occurred.");
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [asyncFn]
  );

  useEffect(() => {
    if (immediate) {
      run(...args).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, run]);

  const reset = useCallback(() => {
    setData(null);
    setError("");
    setLoading(false);
  }, []);

  return { data, loading, error, run, reset, setData };
}
