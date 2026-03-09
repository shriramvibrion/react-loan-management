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
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "24px 28px",
          minWidth: 340,
          maxWidth: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1e293b",
              marginBottom: 16,
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
