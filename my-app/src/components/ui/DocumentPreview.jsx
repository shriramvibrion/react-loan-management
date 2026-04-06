import { useState, useCallback } from "react";
import Modal from "./Modal";

/**
 * Document preview component that shows uploaded file preview (image or PDF)
 * with a modal for full-size viewing.
 */
export default function DocumentPreview({ file, existingUrl, label }) {
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);

  // Generate preview from File object
  const handlePreview = useCallback(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type;
      setPreviewUrl(url);
      setFileType(type);
      setShowModal(true);
    } else if (existingUrl) {
      setPreviewUrl(existingUrl);
      // Try to determine type from URL
      const lower = existingUrl.toLowerCase();
      if (lower.endsWith(".pdf")) {
        setFileType("application/pdf");
      } else if (lower.match(/\.(jpg|jpeg|png|gif|webp)/)) {
        setFileType("image");
      } else {
        setFileType("unknown");
      }
      setShowModal(true);
    }
  }, [file, existingUrl]);

  const handleClose = () => {
    if (previewUrl && file) {
      URL.revokeObjectURL(previewUrl);
    }
    setShowModal(false);
    setPreviewUrl(null);
  };

  const hasPreview = file || existingUrl;
  if (!hasPreview) return null;

  const isImage = file
    ? file.type?.startsWith("image/")
    : fileType === "image";
  const isPdf = file
    ? file.type === "application/pdf"
    : fileType === "application/pdf";

  // Thumbnail for file objects
  const thumbnailUrl = file && file.type?.startsWith("image/")
    ? URL.createObjectURL(file)
    : null;

  return (
    <>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={label || "preview"}
            style={{
              width: 40,
              height: 40,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid rgba(15,23,42,0.1)",
              cursor: "pointer",
            }}
            onClick={handlePreview}
            onLoad={() => URL.revokeObjectURL(thumbnailUrl)}
          />
        )}
        <button
          type="button"
          onClick={handlePreview}
          style={{
            background: "none",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "#6366f1",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          👁️ Preview
        </button>
      </div>

      <Modal
        open={showModal}
        title={label || "Document Preview"}
        onClose={handleClose}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              border: "1px solid rgba(15,23,42,0.15)",
              background: "#fff",
              borderRadius: 999,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: "28px",
              color: "#475569",
            }}
            aria-label="Close preview"
            title="Close"
          >
            ×
          </button>
        </div>
        <div style={{ maxHeight: "70vh", overflow: "auto", textAlign: "center" }}>
          {previewUrl && isImage && (
            <img
              src={previewUrl}
              alt={label || "Document"}
              style={{
                maxWidth: "100%",
                maxHeight: "65vh",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(15,23,42,0.1)",
              }}
            />
          )}
          {previewUrl && isPdf && (
            <iframe
              src={previewUrl}
              title={label || "PDF Preview"}
              style={{
                width: "100%",
                height: "65vh",
                border: "none",
                borderRadius: 8,
              }}
            />
          )}
          {previewUrl && !isImage && !isPdf && (
            <div style={{ padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Preview not available for this file type</div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "var(--text-on-accent)",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Open File
              </a>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: "inline-block",
                  marginTop: 12,
                  marginLeft: 8,
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  color: "#334155",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
