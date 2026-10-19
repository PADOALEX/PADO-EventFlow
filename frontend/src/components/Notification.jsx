import { useEffect } from "react";

export default function Notification({ message, onClose }) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timerId);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className="notification" role="status" aria-live="polite">
      <span className="notification-mark" aria-hidden="true">✓</span>
      <span>{message}</span>
      <button type="button" className="notification-close" onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}
