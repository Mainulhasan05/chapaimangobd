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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label className="form-label" htmlFor={id || name} style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Phone size={13} style={{ color: 'var(--accent-secondary)' }} />
          <span>{label} {required && '*'}</span>
        </label>

        {/* 11-Digit Live Indicator Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {len === 0 ? (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
              {required ? '11 digits required' : '11 digits (optional)'}
            </span>
          ) : !startsWith01 ? (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--danger)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <AlertCircle size={10} /> Must start with 01
            </span>
          ) : isValid ? (
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <CheckCircle2 size={11} /> 11/11 Valid BD Number
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500,
              }}
            >
              {len}/11 digits
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative' }}>
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
            letterSpacing: '0.04em',
            borderColor: isValid ? 'rgba(16, 185, 129, 0.5)' : undefined,
            boxShadow: isValid ? '0 0 0 1px rgba(16, 185, 129, 0.2)' : undefined,
          }}
        />
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
