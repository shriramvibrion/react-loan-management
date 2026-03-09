import { useEffect, useCallback } from "react";

/**
 * Confirm dialog / modal overlay.
 * Usage:
 *   <Modal open={showConfirm} title="Confirm Action" onClose={() => setShowConfirm(false)}>
 *     <p>Are you sure?</p>
 *     <Button onClick={onConfirm}>Yes</Button>
 *   </Modal>
 */
export default function Modal({ open, title, onClose, children, style }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && onClose) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "28px 32px",
          minWidth: 360,
          maxWidth: 520,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(15,23,42,0.05)",
          animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
