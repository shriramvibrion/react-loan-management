import { useState, useEffect, useMemo } from "react";
import { fetchUserLoans } from "../services/loanService";
import { normalizeLoan } from "../utils/loanUtils";

export function useDashboardData(userEmail) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const items = await fetchUserLoans(userEmail);
        if (isMounted) {
          setLoans(items.map(normalizeLoan));
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
  }, [userEmail]);

  const bucketCounts = useMemo(() => {
    return loans.reduce(
      (acc, l) => {
        acc[l.bucket] = (acc[l.bucket] || 0) + 1;
        return acc;
      },
      { Draft: 0, Pending: 0, Accepted: 0, Rejected: 0 }
    );
  }, [loans]);

  const loansByCreationOrder = useMemo(() => {
    return [...loans].sort((a, b) => {
      const aDate = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const bDate = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;
      return (a.loan_id || 0) - (b.loan_id || 0);
    });
  }, [loans]);
  
  const displayIdMap = useMemo(() => {
    return new Map(
      loansByCreationOrder.map((loan, idx) => [loan.loan_id, idx + 1])
    );
  }, [loansByCreationOrder]);

  return {
    loans,
    loading,
    message,
    bucketCounts,
    displayIdMap
  };
}
