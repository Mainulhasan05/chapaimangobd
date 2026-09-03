import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Reusable Soft Confirmation Modal
 * Provides a gentle, non-intrusive confirmation dialog with responsive mobile-friendly layout
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
      style={{ backdropFilter: 'blur(6px)', zIndex: 1200, padding: 12 }}
    >
      <div
        className="modal animate-slide-up confirm-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 440,
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 20px 16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-lg)',
                  background: iconConfig.bg,
                  color: iconConfig.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <IconComponent size={20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {message}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={onClose}
              disabled={isLoading}
              style={{ flexShrink: 0, marginTop: -4, marginRight: -4 }}
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
                background: type === 'danger' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {submessage}
            </div>
          )}
        </div>

        <div className="confirm-modal-footer">
          {secondaryAction && (
            <button
              type="button"
              className="btn btn-ghost btn-sm confirm-modal-secondary-btn"
              onClick={secondaryAction.onClick}
              disabled={isLoading}
            >
              {secondaryAction.label}
            </button>
          )}
          <div className="confirm-modal-primary-actions">
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
              style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              {isLoading && <div className="spinner" style={{ width: 14, height: 14 }} />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Confirm Modal Styles */}
      <style>{`
        .confirm-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }

        .confirm-modal-secondary-btn {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .confirm-modal-primary-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        @media (max-width: 480px) {
          .confirm-modal-box {
            max-width: 100% !important;
            margin: 0 auto;
          }

          .confirm-modal-footer {
            flex-direction: column-reverse;
            gap: 8px;
            padding: 14px 16px;
          }

          .confirm-modal-primary-actions {
            display: flex;
            flex-direction: column-reverse;
            width: 100%;
            margin-left: 0;
            gap: 8px;
          }

          .confirm-modal-footer button,
          .confirm-modal-primary-actions button {
            width: 100% !important;
            min-height: 40px;
            font-size: 0.875rem;
            justify-content: center;
          }

          .confirm-modal-secondary-btn {
            order: -1;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--border);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
