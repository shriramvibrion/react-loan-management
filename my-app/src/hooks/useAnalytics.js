import { useState, useEffect, useMemo } from "react";
import { fetchAdminLoans } from "../services/loanService";

export function useAnalytics() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const items = await fetchAdminLoans();
        if (isMounted) {
          setLoans(items);
          setMessage("");
        }
      } catch (err) {
        if (isMounted) {
          setMessage(err.message || "Failed to load loans.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedLoans = useMemo(() => {
    return loans.map((l) => ({
      ...l,
      _status: (l.status || "").toLowerCase(),
      _who: `${l.user_name || ""} ${l.user_email || ""}`.trim(),
    }));
  }, [loans]);

  const loansByCreationOrder = useMemo(() => {
    return [...normalizedLoans].sort((a, b) => {
      const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      return (a.loan_id || 0) - (b.loan_id || 0);
    });
  }, [normalizedLoans]);

  const displayIdMap = useMemo(() => {
    return new Map(
      loansByCreationOrder.map((loan, index) => [loan.loan_id, index + 1])
    );
  }, [loansByCreationOrder]);

  const filteredLoans = useMemo(() => {
    return normalizedLoans.filter((l) => {
      const statusMatches =
        statusFilter === "all"
          ? true
          : statusFilter === "accepted"
          ? l._status === "approved" || l._status === "accepted"
          : l._status === statusFilter;

      if (!statusMatches) return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        String(l.loan_id).includes(q) ||
        String(displayIdMap.get(l.loan_id) || "").includes(q) ||
        String(l.user_email || "").toLowerCase().includes(q) ||
        String(l.user_name || "").toLowerCase().includes(q) ||
        String(l.status || "").toLowerCase().includes(q)
      );
    });
  }, [normalizedLoans, statusFilter, query, displayIdMap]);

  const { countPending, countApproved, countRejected } = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0;
    for (let i = 0; i < normalizedLoans.length; i++) {
      const s = normalizedLoans[i]._status;
      if (s === "pending") pending++;
      else if (s === "approved" || s === "accepted") approved++;
      else if (s === "rejected") rejected++;
    }
    return { countPending: pending, countApproved: approved, countRejected: rejected };
  }, [normalizedLoans]);

  return {
    loans: normalizedLoans,
    loading,
    message,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    displayIdMap,
    filteredLoans,
    countPending,
    countApproved,
    countRejected,
  };
}
