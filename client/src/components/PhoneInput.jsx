import React from 'react';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Normalizes any Bangladeshi phone number input:
 * - Strips non-digits
 * - Trims +880 or 880 prefix
 * - Caps at 11 digits
 */
export const cleanBDPhone = (val) => {
  if (!val) return '';
  let digits = val.toString().replace(/\D/g, '');
  if ((digits.startsWith('8801') || digits.startsWith('880')) && digits.length >= 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith('88') && digits.length === 13) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

export const isBDPhoneValid = (val) => {
  const digits = cleanBDPhone(val);
  return digits.length === 11 && /^01[3-9]\d{8}$/.test(digits);
};

const PhoneInput = ({
  label = 'Phone Number',
  value = '',
  onChange,
  required = false,
  placeholder = '01XXXXXXXXX',
  name = 'phone',
  id,
  disabled = false,
  autoFocus = false,
  helperText,
}) => {
  const cleanVal = cleanBDPhone(value);
  const len = cleanVal.length;
  const startsWith01 = len >= 2 ? cleanVal.startsWith('01') : len === 1 ? cleanVal === '0' : true;
  const isValid = len === 11 && /^01[3-9]\d{8}$/.test(cleanVal);

  const handleChange = (e) => {
    const cleaned = cleanBDPhone(e.target.value);
    if (onChange) {
      onChange(cleaned);
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
      {/* Label Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label
          className="form-label"
          htmlFor={id || name}
          style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <Phone size={14} style={{ color: 'var(--accent-secondary)' }} />
          <span>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</span>
        </label>

        {/* Live Top Badge */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.02em',
            background: isValid
              ? 'rgba(16, 185, 129, 0.12)'
              : !startsWith01 && len >= 2
              ? 'rgba(239, 68, 68, 0.1)'
              : len > 0
              ? 'rgba(245, 158, 11, 0.12)'
              : 'var(--bg-card)',
            color: isValid
              ? '#10b981'
              : !startsWith01 && len >= 2
              ? '#ef4444'
              : len > 0
              ? '#f59e0b'
              : 'var(--text-tertiary)',
            border: `1px solid ${
              isValid
                ? 'rgba(16, 185, 129, 0.3)'
                : !startsWith01 && len >= 2
                ? 'rgba(239, 68, 68, 0.3)'
                : len > 0
                ? 'rgba(245, 158, 11, 0.3)'
                : 'var(--border)'
            }`,
          }}
        >
          {len === 0 ? '0 / 11 Digits' : `${len} / 11 Digits`}
        </span>
      </div>

      {/* Input Box with Internal In-Field Pill */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id || name}
          name={name}
          type="tel"
          className="form-input"
          placeholder={placeholder}
          value={cleanVal}
          onChange={handleChange}
          maxLength={11}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.05em',
            paddingRight: 105,
            fontSize: '0.9375rem',
            borderColor: isValid
              ? '#10b981'
              : !startsWith01 && len >= 2
              ? '#ef4444'
              : len > 0
              ? 'rgba(245, 158, 11, 0.6)'
              : undefined,
            boxShadow: isValid
              ? '0 0 0 2px rgba(16, 185, 129, 0.15)'
              : !startsWith01 && len >= 2
              ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
              : undefined,
          }}
        />

        {/* In-field Right Indicator Pill */}
        <div
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {len === 0 ? (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-card)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontWeight: 600,
              }}
            >
              0/11
            </span>
          ) : !startsWith01 ? (
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.12)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <AlertCircle size={10} /> 01X only
            </span>
          ) : isValid ? (
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <CheckCircle2 size={11} /> 11/11 ✓
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.15)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                fontWeight: 700,
              }}
            >
              {len}/11 digits
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Bar (0 to 11 digits) */}
      <div
        style={{
          width: '100%',
          height: 3,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: 6,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (len / 11) * 100)}%`,
            height: '100%',
            background: isValid
              ? '#10b981'
              : !startsWith01 && len >= 2
              ? '#ef4444'
              : '#f59e0b',
            transition: 'width 0.15s ease, background-color 0.15s ease',
          }}
        />
      </div>

      {/* Bottom Live Explanatory Text */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        <span
          style={{
            color: isValid
              ? '#10b981'
              : !startsWith01 && len >= 2
              ? '#ef4444'
              : len > 0
              ? '#f59e0b'
              : 'var(--text-tertiary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {len === 0 ? (
            required ? '11 digits required (e.g. 017XXXXXXXX)' : '11 digits optional'
          ) : !startsWith01 ? (
            <>Must start with 01 (currently: {cleanVal.slice(0, 2)})</>
          ) : isValid ? (
            <>✓ 11 of 11 digits typed (Valid Bangladeshi Phone)</>
          ) : (
            <>{len} of 11 digits typed ({11 - len} remaining)</>
          )}
        </span>

        <span
          style={{
            fontSize: '0.6875rem',
            color: isValid ? '#10b981' : 'var(--text-tertiary)',
            fontWeight: 600,
          }}
        >
          {isValid ? 'VALID' : `${len}/11`}
        </span>
      </div>

      {helperText && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
          {helperText}
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
