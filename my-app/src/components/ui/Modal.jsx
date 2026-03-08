import React, { useEffect } from "react";
import "./Modal.css";

export default function Modal({ isOpen, onClose, title, children, maxWidth = "500px" }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div
        className="ds-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-header">
          <h2 className="ds-modal-title">{title}</h2>
          <button className="ds-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="ds-modal-body">{children}</div>
      </div>
    </div>
  );
}
