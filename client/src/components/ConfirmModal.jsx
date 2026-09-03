import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Reusable Soft Confirmation Modal
 * Provides a gentle, non-intrusive confirmation dialog with smooth animations
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  submessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
  secondaryAction = null,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      icon: AlertTriangle,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      btnClass: 'btn-danger',
    },
    warning: {
      icon: AlertCircle,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      btnClass: 'btn-primary',
    },
    info: {
      icon: Info,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      btnClass: 'btn-primary',
    },
  }[type] || {
    icon: AlertTriangle,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    btnClass: 'btn-danger',
  };

  const IconComponent = iconConfig.icon;

  return (
    <div
      className="modal-overlay"
      onClick={() => !isLoading && onClose()}
      style={{ backdropFilter: 'blur(6px)', zIndex: 1200 }}
    >
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '24px 24px 18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-lg)',
                  background: iconConfig.bg,
                  color: iconConfig.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                  {message}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onClose}
              disabled={isLoading}
              style={{ flexShrink: 0, marginTop: -4, marginRight: -6 }}
            >
              <X size={16} />
            </button>
          </div>

          {submessage && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              {submessage}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {secondaryAction && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={secondaryAction.onClick}
              disabled={isLoading}
              style={{ marginRight: 'auto', fontSize: '0.8125rem' }}
            >
              {secondaryAction.label}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isLoading}
            style={{ minWidth: 70 }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${iconConfig.btnClass} btn-sm`}
            onClick={onConfirm}
            disabled={isLoading}
            style={{ minWidth: 80, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {isLoading && <div className="spinner" style={{ width: 14, height: 14 }} />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
