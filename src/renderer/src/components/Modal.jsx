import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const VARIANTS = {
  info: {
    confirm: 'bg-[#1ed760] text-black hover:brightness-110',
    icon: 'text-[#1ed760]',
  },
  danger: {
    confirm: 'bg-[#e8115b] text-white hover:brightness-110',
    icon: 'text-[#e8115b]',
  },
};

export default function Modal({
  open,
  mode = 'confirm',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  inputValue = '',
  inputPlaceholder = '',
  onConfirm,
  onCancel,
}) {
  const [draft, setDraft] = useState(inputValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraft(inputValue);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, inputValue]);

  if (!open) return null;

  const styles = VARIANTS[variant] || VARIANTS.info;
  const showCancel = mode !== 'alert';

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onCancel) onCancel();
    if (e.key === 'Enter') onConfirm?.(draft);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onCancel) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md bg-[#181818] border border-[#3e3e3e] rounded-lg shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className={`text-lg font-bold text-white ${styles.icon}`}>{title}</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              aria-label="Close"
              className="text-[#727272] hover:text-white transition-colors -mt-1 -mr-1 p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {message && <p className="text-sm text-[#a7a7a7] leading-relaxed">{message}</p>}

        {mode === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={inputPlaceholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#242424] text-white px-4 py-3 rounded-md text-sm font-medium outline-none focus:ring-2 focus:ring-white transition-all placeholder-[#727272]"
          />
        )}

        <div className="flex items-center justify-end gap-2 mt-1">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-[#a7a7a7] hover:text-white transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => onConfirm?.(draft)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${styles.confirm}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}