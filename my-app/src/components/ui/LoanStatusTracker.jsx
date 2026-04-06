import { useEffect, useState } from "react";
import { fetchLoanHistory } from "../../services/loanService";

const STATUS_STEPS = [
  { key: "Pending", label: "Submitted", icon: "📝", color: "#f59e0b" },
  { key: "Approved", label: "Approved", icon: "✅", color: "#10b981" },
  { key: "Rejected", label: "Rejected", icon: "❌", color: "#ef4444" },
];

export default function LoanStatusTracker({ loanId, currentStatus }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loanId) return;
    const load = async () => {
      try {
        const data = await fetchLoanHistory(loanId);
        setHistory(data);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId]);

  const status = (currentStatus || "").toLowerCase();
  const isRejected = status === "rejected";
  const isApproved = status === "approved" || status === "accepted";

  // Build step states
  const steps = [
    {
      label: "Application Submitted",
      icon: "📝",
      done: true,
      active: status === "pending",
      time: history.find((h) => h.new_status === "Pending")?.changed_at,
    },
    {
      label: "Under Review",
      icon: "🔍",
      done: status !== "pending" && status !== "draft",
      active: status === "pending",
      time: null,
    },
  ];

  if (isRejected) {
    steps.push({
      label: "Rejected",
      icon: "❌",
      done: true,
      active: true,
      time: history.find((h) => h.new_status === "Rejected")?.changed_at,
      color: "#ef4444",
    });
  } else {
    steps.push({
      label: "Approved",
      icon: "✅",
      done: isApproved,
      active: isApproved,
      time: history.find((h) => h.new_status === "Approved")?.changed_at,
      color: "#10b981",
    });
  }

  if (loading) {
    return (
      <div style={{ padding: "12px 0", color: "#94a3b8", fontSize: 13 }}>
        Loading status timeline...
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        {steps.map((step, i) => {
          const lineColor = step.done ? (step.color || "#6366f1") : "#e2e8f0";
          const dotBg = step.done
            ? (step.color || "#6366f1")
            : step.active
              ? "#f59e0b"
              : "#e2e8f0";
          const textColor = step.done ? "#1e293b" : "#94a3b8";

          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{
                  position: "absolute",
                  top: 16,
                  right: "50%",
                  width: "100%",
                  height: 3,
                  background: steps[i].done || steps[i - 1].done ? lineColor : "#e2e8f0",
                  zIndex: 0,
                  borderRadius: 2,
                }} />
              )}

              {/* Step dot */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: dotBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                zIndex: 1,
                boxShadow: step.done ? `0 4px 12px ${dotBg}44` : "none",
                border: step.active && !step.done ? "3px solid #f59e0b" : "none",
                transition: "all 0.3s ease",
              }}>
                {step.done ? step.icon : (
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: step.active ? "#f59e0b" : "#cbd5e1",
                  }} />
                )}
              </div>

              {/* Label */}
              <div style={{
                marginTop: 8,
                fontSize: 12,
                fontWeight: step.done || step.active ? 700 : 500,
                color: textColor,
                textAlign: "center",
              }}>
                {step.label}
              </div>

              {/* Time */}
              {step.time && (
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textAlign: "center" }}>
                  {new Date(step.time).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* History log */}
      {history.length > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Status History</div>
          {history.map((h) => (
            <div key={h.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              fontSize: 12,
              color: "#475569",
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: h.new_status === "Rejected" ? "#ef4444" : h.new_status === "Approved" ? "#10b981" : "#6366f1",
                flexShrink: 0,
              }} />
              <span>
                {h.old_status ? `${h.old_status} → ` : ""}{h.new_status}
              </span>
              <span style={{ color: "#94a3b8", marginLeft: "auto" }}>
                {h.changed_at ? new Date(h.changed_at).toLocaleString() : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
