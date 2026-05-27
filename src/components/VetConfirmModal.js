import "../css/VetConfirmModal.css";

const VetConfirmModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) => (
  <div className="vet-confirm-overlay" onClick={onCancel}>
    <div
      className="vet-confirm-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vet-confirm-title"
    >
      <div className={`vet-confirm-icon vet-confirm-icon-${tone}`}>
        <span>!</span>
      </div>
      <h3 id="vet-confirm-title">{title}</h3>
      <p>{message}</p>
      <div className="vet-confirm-actions">
        <button
          type="button"
          className="vet-confirm-cancel"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`vet-confirm-submit vet-confirm-submit-${tone}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default VetConfirmModal;
