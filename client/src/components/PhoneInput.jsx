import React, { useEffect, useRef, useState } from 'react';
import { Phone, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  composePhone,
  getCountry,
  parsePhone,
  toNationalInput,
} from '../utils/phone';

// Countries a Chapai Mango customer is most likely to be in, pinned to the top
// of the picker; everything else follows alphabetically.
const PINNED = ['BD', 'SA', 'AE', 'MY', 'US', 'GB', 'IT', 'KW', 'QA', 'OM', 'SG', 'IN', 'CA', 'AU'];

const PINNED_COUNTRIES = PINNED.map((iso2) => getCountry(iso2)).filter(Boolean);
const OTHER_COUNTRIES = COUNTRIES.filter((c) => !PINNED.includes(c.iso2)).sort((a, b) =>
  a.name.localeCompare(b.name)
);

/**
 * Phone field with an international country selector.
 *
 * `onChange` always emits the canonical storage value: "01XXXXXXXXX" for
 * Bangladesh, "+<countrycode><national>" for everywhere else.
 *
 * Pass `international={false}` to lock the field to Bangladesh (used where the
 * number must be reachable by the domestic SMS gateway).
 */
const PhoneInput = ({
  label = 'Phone Number',
  value = '',
  onChange,
  required = false,
  placeholder,
  name = 'phone',
  id,
  disabled = false,
  autoFocus = false,
  helperText,
  international = true,
}) => {
  const initial = parsePhone(value);
  const [country, setCountry] = useState(
    international && initial.iso2 ? initial.iso2 : DEFAULT_COUNTRY
  );
  const [digits, setDigits] = useState(toNationalInput(value, country));
  const emittedRef = useRef(value || '');

  // Re-sync when the value changes from the outside (e.g. an edit modal loads a
  // customer, or the form is reset). Values we emitted ourselves are ignored so
  // the field never fights the user mid-typing.
  useEffect(() => {
    const incoming = value || '';
    if (incoming === emittedRef.current) return;
    const parsed = parsePhone(incoming);
    const nextCountry = international && parsed.iso2 ? parsed.iso2 : DEFAULT_COUNTRY;
    setCountry(nextCountry);
    setDigits(toNationalInput(incoming, nextCountry));
    emittedRef.current = incoming;
  }, [value, international]);

  const activeCountry = getCountry(country) || getCountry(DEFAULT_COUNTRY);
  const isBD = activeCountry.iso2 === 'BD';

  // BD is entered in its familiar local form (01XXXXXXXXX); every other country
  // is entered as the national number sitting after the dial code.
  const maxDigits = isBD ? 11 : (activeCountry.max || 14);
  const expectedDigits = isBD ? 11 : activeCountry.max || null;

  const emit = (nextCountry, nextDigits) => {
    const storage = composePhone(nextCountry, nextDigits);
    emittedRef.current = storage;
    if (onChange) onChange(storage);
  };

  const handleDigitsChange = (e) => {
    const raw = e.target.value;
    let cleaned = raw.replace(/\D/g, '');

    // A pasted number that carries its own country code re-anchors the whole
    // field, so pasting "+1 415 555 2671" switches the picker to the US rather
    // than being truncated into the current country's number.
    if (international && cleaned.length > digits.length + 1) {
      const pasted = parsePhone(raw, country);
      if (pasted.valid && pasted.iso2) {
        const nextDigits = toNationalInput(pasted.storage, pasted.iso2);
        setCountry(pasted.iso2);
        setDigits(nextDigits);
        emittedRef.current = pasted.storage;
        if (onChange) onChange(pasted.storage);
        return;
      }
    }

    // BD subscriber numbers are habitually written with the trunk 0
    if (isBD && cleaned.startsWith('1')) cleaned = `0${cleaned}`;
    cleaned = cleaned.slice(0, maxDigits);
    setDigits(cleaned);
    emit(country, cleaned);
  };

  const handleCountryChange = (e) => {
    const nextCountry = e.target.value;
    const nextIsBD = nextCountry === 'BD';
    // Keep the digits the user already typed, re-anchored to the new country
    let carried = digits.replace(/^0+/, '');
    if (nextIsBD && carried) carried = `0${carried}`;
    const nextMax = nextIsBD ? 11 : getCountry(nextCountry)?.max || 14;
    carried = carried.slice(0, nextMax);
    setCountry(nextCountry);
    setDigits(carried);
    emit(nextCountry, carried);
  };

  const storage = composePhone(country, digits);
  const parsed = parsePhone(storage);
  const len = digits.length;
  const isValid = parsed.valid;
  // BD has a fixed operator prefix, so a wrong start is worth flagging early
  const badPrefix = isBD && len >= 2 && !digits.startsWith('01');

  const tone = isValid ? 'ok' : badPrefix ? 'bad' : len > 0 ? 'pending' : 'idle';
  const COLOR = { ok: '#10b981', bad: '#ef4444', pending: '#f59e0b', idle: 'var(--text-tertiary)' };
  const TINT = {
    ok: 'rgba(16, 185, 129, 0.12)',
    bad: 'rgba(239, 68, 68, 0.1)',
    pending: 'rgba(245, 158, 11, 0.12)',
    idle: 'var(--bg-card)',
  };
  const EDGE = {
    ok: 'rgba(16, 185, 129, 0.3)',
    bad: 'rgba(239, 68, 68, 0.3)',
    pending: 'rgba(245, 158, 11, 0.3)',
    idle: 'var(--border)',
  };

  const counter = expectedDigits ? `${len} / ${expectedDigits}` : `${len} digits`;
  const effectivePlaceholder = placeholder || (isBD ? '01XXXXXXXXX' : 'National number');

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

        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 'var(--radius-sm)',
            letterSpacing: '0.02em',
            background: TINT[tone],
            color: COLOR[tone],
            border: `1px solid ${EDGE[tone]}`,
          }}
        >
          {counter}
        </span>
      </div>

      {/* Country selector + number field */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        {international && (
          <div style={{ position: 'relative', flexShrink: 0, width: 128 }}>
            <select
              className="form-input"
              aria-label="Country code"
              value={country}
              onChange={handleCountryChange}
              disabled={disabled}
              style={{
                width: '100%',
                height: '100%',
                paddingRight: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <optgroup label="Frequently used">
                {PINNED_COUNTRIES.map((c) => (
                  <option key={`p-${c.iso2}`} value={c.iso2}>
                    {c.flag} {c.iso2} +{c.dial}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All countries">
                {OTHER_COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.flag} {c.name} +{c.dial}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <input
            id={id || name}
            name={name}
            type="tel"
            inputMode="numeric"
            className="form-input"
            placeholder={effectivePlaceholder}
            value={digits}
            onChange={handleDigitsChange}
            // No maxLength: it would silently truncate a pasted international
            // number before handleDigitsChange could recognise its country.
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.05em',
              paddingRight: 92,
              fontSize: '0.9375rem',
              borderColor: tone === 'idle' ? undefined : COLOR[tone],
              boxShadow:
                tone === 'ok'
                  ? '0 0 0 2px rgba(16, 185, 129, 0.15)'
                  : tone === 'bad'
                  ? '0 0 0 2px rgba(239, 68, 68, 0.15)'
                  : undefined,
            }}
          />

          {/* In-field status pill */}
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
            <span
              style={{
                fontSize: '0.6875rem',
                color: COLOR[tone],
                background: TINT[tone],
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${EDGE[tone]}`,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                whiteSpace: 'nowrap',
              }}
            >
              {isValid ? (
                <><CheckCircle2 size={11} /> Valid</>
              ) : badPrefix ? (
                <><AlertCircle size={10} /> 01X only</>
              ) : len === 0 ? (
                `+${activeCountry.dial}`
              ) : (
                counter
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar, only meaningful when the length is known up front */}
      {expectedDigits && (
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
              width: `${Math.min(100, (len / expectedDigits) * 100)}%`,
              height: '100%',
              background: COLOR[tone === 'idle' ? 'pending' : tone],
              transition: 'width 0.15s ease, background-color 0.15s ease',
            }}
          />
        </div>
      )}

      {/* Live explanatory line */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.75rem',
          fontWeight: 500,
          marginTop: expectedDigits ? 0 : 6,
        }}
      >
        <span style={{ color: COLOR[tone], display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {len === 0 ? (
            isBD
              ? required
                ? '11 digits required (e.g. 017XXXXXXXX)'
                : '11 digits optional'
              : `Enter the ${activeCountry.name} number without the +${activeCountry.dial}`
          ) : badPrefix ? (
            <>Must start with 01 (currently: {digits.slice(0, 2)})</>
          ) : isValid ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <CheckCircle2 size={12} /> {isBD ? 'Valid Bangladeshi number' : `Valid ${activeCountry.name} number`} ({parsed.e164})
            </span>
          ) : expectedDigits ? (
            <>{len} of {expectedDigits} digits typed ({Math.max(0, expectedDigits - len)} remaining)</>
          ) : (
            <>{len} digits typed</>
          )}
        </span>

        {international && !isBD && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--text-tertiary)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
            title="Local SMS is Bangladesh only. Foreign numbers are reached over WhatsApp."
          >
            <Globe size={11} /> WhatsApp only
          </span>
        )}
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
