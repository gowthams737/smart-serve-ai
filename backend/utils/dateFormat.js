/**
 * Date Formatting & Validation Utilities for SmartServe AI (Backend)
 * Standardizes all date displays and date inputs across the project to DD/MM/YYYY (Day/Month/Year).
 * Strictly validates dates (e.g. rejects 31/02/2026, supports leap years like 29/02/2028),
 * and avoids timezone day-shift bugs by parsing date components directly.
 */

/**
 * Checks if a year is a leap year.
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Returns the maximum days in a given month of a specific year.
 * @param {number} month 1 to 12
 * @param {number} year 4-digit year
 * @returns {number}
 */
export function getDaysInMonth(month, year) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/**
 * Formats any date input (Date instance, timestamp, ISO string, YYYY-MM-DD, or DD/MM/YYYY)
 * to standard DD/MM/YYYY string.
 * @param {string|number|Date} dateInput
 * @returns {string} Formatted date as "DD/MM/YYYY" or empty string if invalid
 */
export function formatDateDDMMYYYY(dateInput) {
  if (!dateInput && dateInput !== 0) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';

    // Already DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const d = ddmmyyyyMatch[1].padStart(2, '0');
      const m = ddmmyyyyMatch[2].padStart(2, '0');
      const y = ddmmyyyyMatch[3];
      return `${d}/${m}/${y}`;
    }

    // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const yyyymmddMatch = trimmed.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
    if (yyyymmddMatch) {
      const y = yyyymmddMatch[1];
      const m = yyyymmddMatch[2].padStart(2, '0');
      const d = yyyymmddMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
  }

  // Handle Date instance or timestamp
  const dateObj = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return '';
}

/**
 * Parses and strictly validates a date string in DD/MM/YYYY format (also tolerates YYYY-MM-DD).
 * Accurately handles days per month and leap years (e.g. 29/02/2028 is valid, 31/02/2026 is invalid).
 * @param {string} str
 * @returns {{ valid: boolean, day?: number, month?: number, year?: number, formatted?: string, isoDate?: string, error?: string }}
 */
export function parseDDMMYYYY(str) {
  if (!str || typeof str !== 'string') {
    return { valid: false, error: 'Date is required.' };
  }

  const trimmed = str.trim();
  let day, month, year;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    day = parseInt(ddmmyyyyMatch[1], 10);
    month = parseInt(ddmmyyyyMatch[2], 10);
    year = parseInt(ddmmyyyyMatch[3], 10);
  } else {
    // Check YYYY-MM-DD fallback
    const yyyymmddMatch = trimmed.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
    if (yyyymmddMatch) {
      year = parseInt(yyyymmddMatch[1], 10);
      month = parseInt(yyyymmddMatch[2], 10);
      day = parseInt(yyyymmddMatch[3], 10);
    } else {
      return { valid: false, error: 'Invalid format. Use DD/MM/YYYY.' };
    }
  }

  if (isNaN(year) || year < 1900 || year > 2100) {
    return { valid: false, error: 'Year must be between 1900 and 2100.' };
  }

  if (isNaN(month) || month < 1 || month > 12) {
    return { valid: false, error: 'Month must be between 01 and 12.' };
  }

  const maxDays = getDaysInMonth(month, year);
  if (isNaN(day) || day < 1 || day > maxDays) {
    const monthName = MONTH_NAMES[month - 1];
    if (month === 2) {
      const msg = isLeapYear(year)
        ? `February ${year} has only 29 days.`
        : `February ${year} has only 28 days (not a leap year).`;
      return { valid: false, error: msg };
    }
    return { valid: false, error: `${monthName} has only ${maxDays} days.` };
  }

  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  const y = String(year);

  return {
    valid: true,
    day,
    month,
    year,
    formatted: `${d}/${m}/${y}`,
    isoDate: `${y}-${m}-${d}`
  };
}

/**
 * Returns true if the string is a valid DD/MM/YYYY (or YYYY-MM-DD) date.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDDMMYYYY(str) {
  return parseDDMMYYYY(str).valid;
}

/**
 * Converts a DD/MM/YYYY string to YYYY-MM-DD (ISO date).
 * Avoids any timezone shift.
 * @param {string} dateStr
 * @returns {string}
 */
export function toISODate(dateStr) {
  const parsed = parseDDMMYYYY(dateStr);
  return parsed.valid ? parsed.isoDate : '';
}

/**
 * Converts a YYYY-MM-DD string to DD/MM/YYYY.
 * Avoids any timezone shift.
 * @param {string} isoStr
 * @returns {string}
 */
export function fromISODate(isoStr) {
  return formatDateDDMMYYYY(isoStr);
}

/**
 * Gets day of week name ('Monday', 'Tuesday', etc.) for any date.
 * Uses UTC Date construction to guarantee no timezone shifts.
 * @param {string|Date} dateInput
 * @returns {string} e.g. "Monday"
 */
export function getDayOfWeek(dateInput) {
  let year, month, day;

  if (typeof dateInput === 'string') {
    const parsed = parseDDMMYYYY(dateInput);
    if (!parsed.valid) return '';
    year = parsed.year;
    month = parsed.month;
    day = parsed.day;
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    year = dateInput.getFullYear();
    month = dateInput.getMonth() + 1;
    day = dateInput.getDate();
  } else {
    return '';
  }

  // Construct in UTC to prevent timezone day-shift
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return DAY_NAMES[utcDate.getUTCDay()];
}

/**
 * Compares two DD/MM/YYYY (or YYYY-MM-DD) dates chronologically.
 * @param {string} a
 * @param {string} b
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
 */
export function compareDatesDDMMYYYY(a, b) {
  const parsedA = parseDDMMYYYY(a);
  const parsedB = parseDDMMYYYY(b);
  if (!parsedA.valid && !parsedB.valid) return 0;
  if (!parsedA.valid) return 1;
  if (!parsedB.valid) return -1;
  return parsedA.isoDate.localeCompare(parsedB.isoDate);
}

/**
 * Returns true if two dates represent the exact same calendar day.
 * Supports comparison across DD/MM/YYYY and YYYY-MM-DD formats.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function areDatesEqual(a, b) {
  const parsedA = parseDDMMYYYY(a);
  const parsedB = parseDDMMYYYY(b);
  if (!parsedA.valid || !parsedB.valid) return false;
  return parsedA.isoDate === parsedB.isoDate;
}

/**
 * Returns today's date formatted as DD/MM/YYYY.
 * @returns {string}
 */
export function getTodayDDMMYYYY() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Formats a timestamp into human-readable relative time (e.g. "Just now", "5m ago", "2h ago", "3d ago", or "DD/MM/YYYY").
 * @param {string|number|Date} dateInput
 * @returns {string}
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Just now';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Just now';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateDDMMYYYY(d) || `${diffDays}d ago`;
}
