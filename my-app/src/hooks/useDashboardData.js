import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan } from "../utils/loanUtils";

/**
 * Custom hook for user dashboard data fetching & filtering.
 * Centralizes loan loading, tab filtering, display ID mapping, and bucket counts.
 */
export default function useDashboardData(userEmail) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const items = await fetchUserLoans(userEmail);
        if (!cancelled) {
          setLoans(items.map(normalizeLoan));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load loans.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const bucketCounts = useMemo(
    () =>
      loans.reduce(
        (acc, l) => {
          acc[l.bucket] = (acc[l.bucket] || 0) + 1;
          return acc;
        },
        { Draft: 0, Pending: 0, Accepted: 0, Rejected: 0 }
      ),
    [loans]
  );

  const filteredLoans = useMemo(
    () => (tab === "all" ? loans : loans.filter((l) => l.bucket === tab)),
    [loans, tab]
  );

  const displayIdMap = useMemo(() => {
    const sorted = [...loans].sort((a, b) => {
      const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      return (a.loan_id || 0) - (b.loan_id || 0);
    });
    return new Map(sorted.map((loan, idx) => [loan.loan_id, idx + 1]));
  }, [loans]);

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    try {
      setLoading(true);
      const items = await fetchUserLoans(userEmail);
      setLoans(items.map(normalizeLoan));
    } catch (err) {
      setError(err.message || "Failed to load loans.");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  return {
    loans,
    loading,
    error,
    tab,
    setTab,
    bucketCounts,
    filteredLoans,
    displayIdMap,
    refresh,
  };
}
