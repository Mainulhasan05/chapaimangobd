/**
 * Shared international phone utilities.
 *
 * Storage convention (kept deliberately backward compatible):
 *   - Bangladesh numbers stay in the legacy local form  -> "01712345678"
 *   - Every other country is stored in E.164 form       -> "+14155552671"
 *
 * The leading "+" is therefore an unambiguous marker for "this is a foreign
 * number". Existing BD rows, the unique index on Customer.phone and the
 * Automas SMS gateway path all keep working untouched.
 *
 * NOTE: this file is duplicated verbatim at client/src/utils/phone.js because
 * the client and server are separate packages with no shared build step.
 * Keep both copies in sync.
 */

// [iso2, name, dialCode, minNationalDigits, maxNationalDigits]
// min/max are omitted where the national numbering plan is variable; the
// generic E.164 bounds are used in that case.
const RAW_COUNTRIES = [
  ['BD', 'Bangladesh', '880', 10, 10],
  ['IN', 'India', '91', 10, 10],
  ['PK', 'Pakistan', '92', 10, 10],
  ['US', 'United States', '1', 10, 10],
  ['CA', 'Canada', '1', 10, 10],
  ['GB', 'United Kingdom', '44', 9, 10],
  ['SA', 'Saudi Arabia', '966', 9, 9],
  ['AE', 'United Arab Emirates', '971', 8, 9],
  ['QA', 'Qatar', '974', 8, 8],
  ['KW', 'Kuwait', '965', 8, 8],
  ['OM', 'Oman', '968', 8, 8],
  ['BH', 'Bahrain', '973', 8, 8],
  ['MY', 'Malaysia', '60', 8, 10],
  ['SG', 'Singapore', '65', 8, 8],
  ['IT', 'Italy', '39', 9, 11],
  ['AU', 'Australia', '61', 9, 9],
  ['NZ', 'New Zealand', '64', 8, 10],
  ['JP', 'Japan', '81', 9, 10],
  ['KR', 'South Korea', '82', 9, 10],
  ['CN', 'China', '86', 11, 11],
  ['HK', 'Hong Kong', '852', 8, 8],
  ['MO', 'Macau', '853', 8, 8],
  ['TW', 'Taiwan', '886', 9, 9],
  ['TH', 'Thailand', '66', 9, 9],
  ['VN', 'Vietnam', '84', 9, 10],
  ['PH', 'Philippines', '63', 10, 10],
  ['ID', 'Indonesia', '62', 9, 12],
  ['LK', 'Sri Lanka', '94', 9, 9],
  ['NP', 'Nepal', '977', 9, 10],
  ['MV', 'Maldives', '960', 7, 7],
  ['BT', 'Bhutan', '975', 8, 8],
  ['MM', 'Myanmar', '95', 8, 10],
  ['KH', 'Cambodia', '855', 8, 9],
  ['LA', 'Laos', '856', 8, 10],
  ['BN', 'Brunei', '673', 7, 7],
  ['AF', 'Afghanistan', '93', 9, 9],
  ['IR', 'Iran', '98', 10, 10],
  ['IQ', 'Iraq', '964', 10, 10],
  ['JO', 'Jordan', '962', 9, 9],
  ['LB', 'Lebanon', '961', 7, 8],
  ['SY', 'Syria', '963', 9, 9],
  ['YE', 'Yemen', '967', 9, 9],
  ['IL', 'Israel', '972', 9, 9],
  ['PS', 'Palestine', '970', 9, 9],
  ['TR', 'Turkey', '90', 10, 10],
  ['EG', 'Egypt', '20', 10, 10],
  ['LY', 'Libya', '218', 9, 9],
  ['MA', 'Morocco', '212', 9, 9],
  ['DZ', 'Algeria', '213', 9, 9],
  ['TN', 'Tunisia', '216', 8, 8],
  ['SD', 'Sudan', '249', 9, 9],
  ['ET', 'Ethiopia', '251', 9, 9],
  ['KE', 'Kenya', '254', 9, 9],
  ['TZ', 'Tanzania', '255', 9, 9],
  ['UG', 'Uganda', '256', 9, 9],
  ['RW', 'Rwanda', '250', 9, 9],
  ['NG', 'Nigeria', '234', 10, 10],
  ['GH', 'Ghana', '233', 9, 9],
  ['CI', 'Ivory Coast', '225', 10, 10],
  ['SN', 'Senegal', '221', 9, 9],
  ['CM', 'Cameroon', '237', 9, 9],
  ['ZA', 'South Africa', '27', 9, 9],
  ['ZM', 'Zambia', '260', 9, 9],
  ['ZW', 'Zimbabwe', '263', 9, 9],
  ['MW', 'Malawi', '265', 9, 9],
  ['MZ', 'Mozambique', '258', 9, 9],
  ['AO', 'Angola', '244', 9, 9],
  ['BW', 'Botswana', '267', 8, 8],
  ['NA', 'Namibia', '264', 9, 9],
  ['MU', 'Mauritius', '230', 8, 8],
  ['SC', 'Seychelles', '248', 7, 7],
  ['SO', 'Somalia', '252'],
  ['DJ', 'Djibouti', '253'],
  ['ER', 'Eritrea', '291'],
  ['GM', 'Gambia', '220'],
  ['GN', 'Guinea', '224'],
  ['ML', 'Mali', '223'],
  ['BF', 'Burkina Faso', '226'],
  ['NE', 'Niger', '227'],
  ['TG', 'Togo', '228'],
  ['BJ', 'Benin', '229'],
  ['LR', 'Liberia', '231'],
  ['SL', 'Sierra Leone', '232'],
  ['TD', 'Chad', '235'],
  ['CF', 'Central African Republic', '236'],
  ['CV', 'Cape Verde', '238'],
  ['ST', 'Sao Tome and Principe', '239'],
  ['GQ', 'Equatorial Guinea', '240'],
  ['GA', 'Gabon', '241'],
  ['CG', 'Congo', '242'],
  ['CD', 'DR Congo', '243'],
  ['GW', 'Guinea-Bissau', '245'],
  ['BI', 'Burundi', '257'],
  ['LS', 'Lesotho', '266'],
  ['SZ', 'Eswatini', '268'],
  ['KM', 'Comoros', '269'],
  ['MG', 'Madagascar', '261'],
  ['RE', 'Reunion', '262'],
  ['SS', 'South Sudan', '211'],
  ['MR', 'Mauritania', '222'],
  ['DE', 'Germany', '49', 9, 11],
  ['FR', 'France', '33', 9, 9],
  ['ES', 'Spain', '34', 9, 9],
  ['PT', 'Portugal', '351', 9, 9],
  ['NL', 'Netherlands', '31', 9, 9],
  ['BE', 'Belgium', '32', 8, 9],
  ['CH', 'Switzerland', '41', 9, 9],
  ['AT', 'Austria', '43', 9, 13],
  ['SE', 'Sweden', '46', 7, 13],
  ['NO', 'Norway', '47', 8, 8],
  ['DK', 'Denmark', '45', 8, 8],
  ['FI', 'Finland', '358', 6, 12],
  ['IS', 'Iceland', '354', 7, 7],
  ['IE', 'Ireland', '353', 7, 9],
  ['PL', 'Poland', '48', 9, 9],
  ['CZ', 'Czechia', '420', 9, 9],
  ['SK', 'Slovakia', '421', 9, 9],
  ['HU', 'Hungary', '36', 8, 9],
  ['RO', 'Romania', '40', 9, 9],
  ['BG', 'Bulgaria', '359', 8, 9],
  ['GR', 'Greece', '30', 10, 10],
  ['HR', 'Croatia', '385', 8, 9],
  ['RS', 'Serbia', '381', 8, 9],
  ['SI', 'Slovenia', '386', 8, 8],
  ['BA', 'Bosnia and Herzegovina', '387', 8, 8],
  ['MK', 'North Macedonia', '389', 8, 8],
  ['ME', 'Montenegro', '382', 8, 8],
  ['AL', 'Albania', '355', 9, 9],
  ['MT', 'Malta', '356', 8, 8],
  ['CY', 'Cyprus', '357', 8, 8],
  ['LU', 'Luxembourg', '352', 9, 9],
  ['LT', 'Lithuania', '370', 8, 8],
  ['LV', 'Latvia', '371', 8, 8],
  ['EE', 'Estonia', '372', 7, 8],
  ['MD', 'Moldova', '373', 8, 8],
  ['UA', 'Ukraine', '380', 9, 9],
  ['BY', 'Belarus', '375', 9, 9],
  ['RU', 'Russia', '7', 10, 10],
  ['KZ', 'Kazakhstan', '7', 10, 10],
  ['GE', 'Georgia', '995', 9, 9],
  ['AM', 'Armenia', '374', 8, 8],
  ['AZ', 'Azerbaijan', '994', 9, 9],
  ['UZ', 'Uzbekistan', '998', 9, 9],
  ['TM', 'Turkmenistan', '993', 8, 8],
  ['TJ', 'Tajikistan', '992', 9, 9],
  ['KG', 'Kyrgyzstan', '996', 9, 9],
  ['MN', 'Mongolia', '976', 8, 8],
  ['MC', 'Monaco', '377'],
  ['AD', 'Andorra', '376'],
  ['SM', 'San Marino', '378'],
  ['LI', 'Liechtenstein', '423'],
  ['FO', 'Faroe Islands', '298'],
  ['GL', 'Greenland', '299'],
  ['GI', 'Gibraltar', '350'],
  ['MX', 'Mexico', '52', 10, 10],
  ['BR', 'Brazil', '55', 10, 11],
  ['AR', 'Argentina', '54', 10, 11],
  ['CL', 'Chile', '56', 9, 9],
  ['CO', 'Colombia', '57', 10, 10],
  ['PE', 'Peru', '51', 9, 9],
  ['VE', 'Venezuela', '58', 10, 10],
  ['EC', 'Ecuador', '593', 9, 9],
  ['BO', 'Bolivia', '591', 8, 8],
  ['PY', 'Paraguay', '595', 9, 9],
  ['UY', 'Uruguay', '598', 8, 8],
  ['GY', 'Guyana', '592'],
  ['SR', 'Suriname', '597'],
  ['CR', 'Costa Rica', '506', 8, 8],
  ['PA', 'Panama', '507', 8, 8],
  ['GT', 'Guatemala', '502', 8, 8],
  ['SV', 'El Salvador', '503', 8, 8],
  ['HN', 'Honduras', '504', 8, 8],
  ['NI', 'Nicaragua', '505', 8, 8],
  ['BZ', 'Belize', '501'],
  ['CU', 'Cuba', '53'],
  ['HT', 'Haiti', '509'],
  ['FJ', 'Fiji', '679'],
  ['PG', 'Papua New Guinea', '675'],
  ['NC', 'New Caledonia', '687'],
  ['PF', 'French Polynesia', '689'],
  ['WS', 'Samoa', '685'],
  ['TO', 'Tonga', '676'],
  ['VU', 'Vanuatu', '678'],
  ['SB', 'Solomon Islands', '677'],
];

const iso2ToFlag = (iso2) =>
  iso2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');

export const COUNTRIES = RAW_COUNTRIES.map(([iso2, name, dial, min, max]) => ({
  iso2,
  name,
  dial,
  min: min || null,
  max: max || null,
  flag: iso2ToFlag(iso2),
}));

export const DEFAULT_COUNTRY = 'BD';

// Generic E.164 guard rails, used when a country is unknown or has no
// published national-number length in the table above.
const E164_MIN_DIGITS = 7;
const E164_MAX_DIGITS = 15;
const GENERIC_NATIONAL_MIN = 4;
const GENERIC_NATIONAL_MAX = 14;

const BY_ISO2 = new Map(COUNTRIES.map((c) => [c.iso2, c]));

// Longest dial code first, so "880" wins over "88" and "1868" over "1".
const BY_DIAL_DESC = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export const getCountry = (iso2) => BY_ISO2.get((iso2 || '').toUpperCase()) || null;

const countryForDigits = (digits) => BY_DIAL_DESC.find((c) => digits.startsWith(c.dial)) || null;

const nationalLengthOk = (country, national) => {
  const len = national.length;
  if (country && country.min && country.max) {
    return len >= country.min && len <= country.max;
  }
  return len >= GENERIC_NATIONAL_MIN && len <= GENERIC_NATIONAL_MAX;
};

// Builds the Bangladesh result from the 10-digit subscriber part (1XXXXXXXXX).
const buildBD = (subscriber) => {
  const national = (subscriber || '').replace(/^0+/, '').slice(0, 10);
  const local = national ? `0${national}` : '';
  return {
    valid: /^01[3-9]\d{8}$/.test(local),
    isBD: true,
    iso2: 'BD',
    dial: '880',
    national,
    e164: national ? `+880${national}` : '',
    storage: local,
    digits: national ? `880${national}` : '',
  };
};

const EMPTY = {
  valid: false,
  isBD: false,
  iso2: null,
  dial: null,
  national: '',
  e164: '',
  storage: '',
  digits: '',
};

/**
 * Parses any user input into a structured result.
 *
 * @param {string} raw          anything the user typed, or a stored value
 * @param {string} defaultIso2  country assumed when the input carries no
 *                              country code of its own (defaults to BD)
 */
export const parsePhone = (raw, defaultIso2 = DEFAULT_COUNTRY) => {
  if (raw === null || raw === undefined) return { ...EMPTY };

  const str = raw.toString().trim();
  if (!str) return { ...EMPTY };

  const explicitIntl = str.startsWith('+') || str.startsWith('00');
  let digits = str.replace(/\D/g, '');
  if (!digits) return { ...EMPTY };

  // "00" international access prefix -> drop it
  if (!str.startsWith('+') && digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  const fallback = getCountry(defaultIso2) || getCountry(DEFAULT_COUNTRY);
  const fallbackIsBD = !!fallback && fallback.iso2 === 'BD';

  // --- Bangladesh shortcuts (the legacy storage format) ---------------------
  if (digits.startsWith('880') && digits.length === 13) {
    return buildBD(digits.slice(3));
  }
  if (!explicitIntl) {
    // Local dialling form: 01XXXXXXXXX
    if (/^01\d{9}$/.test(digits)) return buildBD(digits.slice(1));
    // Excel strips the leading zero off "01712345678" -> "1712345678"
    if (fallbackIsBD && /^1[3-9]\d{8}$/.test(digits)) return buildBD(digits);
  }

  // --- International -------------------------------------------------------
  let country = null;
  let national = '';

  if (explicitIntl) {
    country = countryForDigits(digits);
    national = country ? digits.slice(country.dial.length) : '';
  } else if (fallback) {
    // No country code typed: read the digits as a national number of the
    // currently selected country, tolerating a national trunk "0" prefix.
    country = fallback;
    national = digits.startsWith('0') ? digits.slice(1) : digits;
    if (digits.startsWith(fallback.dial) && digits.length > fallback.dial.length) {
      // The user pasted the dial code without a leading "+"
      const stripped = digits.slice(fallback.dial.length);
      if (nationalLengthOk(fallback, stripped)) national = stripped;
    }
  }

  if (country && country.iso2 === 'BD') return buildBD(national);

  // Unknown dial code but a plausible E.164 number: still usable for WhatsApp.
  if (!country && explicitIntl) {
    return {
      valid: digits.length >= E164_MIN_DIGITS && digits.length <= E164_MAX_DIGITS,
      isBD: false,
      iso2: null,
      dial: null,
      national: digits,
      e164: `+${digits}`,
      storage: `+${digits}`,
      digits,
      unknownCountry: true,
    };
  }

  if (!country) return { ...EMPTY, digits };

  const e164Digits = `${country.dial}${national}`;

  return {
    valid:
      national.length > 0 &&
      nationalLengthOk(country, national) &&
      e164Digits.length >= E164_MIN_DIGITS &&
      e164Digits.length <= E164_MAX_DIGITS,
    isBD: false,
    iso2: country.iso2,
    dial: country.dial,
    national,
    e164: `+${e164Digits}`,
    storage: `+${e164Digits}`,
    digits: e164Digits,
  };
};

/**
 * Canonical value to persist. BD numbers keep their "01XXXXXXXXX" shape,
 * everything else becomes "+<countrycode><national>".
 * Returns a best-effort partial value while the user is still typing.
 */
export const normalizePhone = (raw, defaultIso2 = DEFAULT_COUNTRY) =>
  parsePhone(raw, defaultIso2).storage || '';

/**
 * Builds a storage value from an explicitly chosen country plus the national
 * digits the user typed. Unlike normalizePhone this never re-guesses the
 * country, so picking "Australia" and typing an 11-digit number that happens
 * to look Bangladeshi still yields an Australian number. A national trunk "0"
 * is dropped.
 */
export const composePhone = (iso2, nationalDigits) => {
  const country = getCountry(iso2) || getCountry(DEFAULT_COUNTRY);
  const national = (nationalDigits || '').toString().replace(/\D/g, '').replace(/^0+/, '');
  if (!national) return '';
  if (country.iso2 === 'BD') return buildBD(national).storage;
  return `+${country.dial}${national}`;
};

/** The digits a country picker should show in its text field for a value. */
export const toNationalInput = (raw, iso2 = DEFAULT_COUNTRY) => {
  const parsed = parsePhone(raw, iso2);
  if (!parsed.digits) return '';
  return parsed.isBD ? parsed.storage : parsed.national;
};

export const isValidPhone = (raw, defaultIso2 = DEFAULT_COUNTRY) =>
  parsePhone(raw, defaultIso2).valid;

/** True only for Bangladeshi numbers - the Automas gateway is domestic only. */
export const isSmsCapable = (raw) => {
  const parsed = parsePhone(raw);
  return parsed.valid && parsed.isBD;
};

export const isBDPhone = (raw) => parsePhone(raw).isBD;

/** Digits-only E.164 (no "+") as required by wa.me links. */
export const toWhatsAppDigits = (raw) => {
  const parsed = parsePhone(raw);
  return parsed.valid ? parsed.digits : '';
};

/** Human readable form for tables and messages. */
export const formatPhoneDisplay = (raw) => {
  const parsed = parsePhone(raw);
  if (!parsed.digits) return raw ? raw.toString() : '';
  if (parsed.isBD) return parsed.storage;
  return parsed.dial ? `+${parsed.dial} ${parsed.national}` : parsed.e164;
};

/** Country record matching a stored value, for seeding a country picker. */
export const detectCountry = (raw) => {
  const parsed = parsePhone(raw);
  return parsed.iso2 ? getCountry(parsed.iso2) : null;
};
