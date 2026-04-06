import { useState, useEffect, useRef, useCallback } from "react";
import { fetchNotifications, markNotificationsRead } from "../../services/loanService";

export default function NotificationBell({ email, role, navigate }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!email) return;
    try {
      setLoading(true);
      const data = await fetchNotifications(email, role);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail - notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [email, role]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpen = () => {
    setOpen((prev) => !prev);
  };

  const handleMarkRead = async (id) => {
    if (!email) return;
    try {
      await markNotificationsRead(email, role, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const handleMarkAllRead = async () => {
    if (!email) return;
    try {
      await markNotificationsRead(email, role);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const typeIcon = (type) => {
    switch (type) {
      case "loan_submitted": return "📝";
      case "loan_approved": return "✅";
      case "loan_rejected": return "❌";
      case "status_change": return "🔄";
      case "new_application": return "📋";
      case "success": return "✅";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      case "admin_remark": return "💬";
      default: return "🔔";
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }

    if (notification.loan_id && typeof navigate === "function") {
      const targetPage = role === "admin" ? "admin-loan-detail" : "user-loan-detail";
      const targetParams = role === "admin"
        ? { loanId: notification.loan_id }
        : { userLoanId: notification.loan_id };
      setOpen(false);
      navigate(targetPage, targetParams);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const isAdmin = role === "admin";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          background: "rgba(255,255,255,0.9)",
          border: `1px solid ${isAdmin ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.15)"}`,
          borderRadius: 12,
          padding: "8px 12px",
          cursor: "pointer",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#ef4444",
              color: "var(--text-on-accent)",
              fontSize: 10,
              fontWeight: 800,
              borderRadius: "50%",
              minWidth: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
              animation: "pulse 2s infinite",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 440,
            background: "rgba(255,255,255,0.98)",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(15,23,42,0.15), 0 4px 16px rgba(15,23,42,0.08)",
            border: "1px solid rgba(15,23,42,0.06)",
            zIndex: 1000,
            overflow: "hidden",
            backdropFilter: "blur(20px)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(15,23,42,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: isAdmin
                ? "linear-gradient(135deg, rgba(249,115,22,0.05), rgba(251,191,36,0.03))"
                : "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.03))",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>Notifications</div>
              {unreadCount > 0 && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {unreadCount} unread
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: isAdmin ? "#f97316" : "#6366f1",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "background 0.2s",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>No notifications yet</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(15,23,42,0.03)",
                    cursor: n.loan_id || !n.is_read ? "pointer" : "default",
                    background: n.is_read ? "transparent" : isAdmin ? "rgba(249,115,22,0.03)" : "rgba(99,102,241,0.03)",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 18, marginTop: 2 }}>{typeIcon(n.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: n.is_read ? 500 : 700,
                        color: n.is_read ? "#64748b" : "#1e293b",
                        marginBottom: 3,
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: isAdmin ? "#f97316" : "#6366f1",
                          flexShrink: 0,
                          marginTop: 6,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
