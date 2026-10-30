/**
 * Time formatting helpers for SmartServe AI
 * Converts 24-hour time strings (e.g. "09:00", "18:00") to 12-hour AM/PM format (e.g. "9:00 AM", "6:00 PM")
 * Formats working hours ranges (e.g. "9:00 AM - 6:00 PM" or "9:00 AM to 6:00 PM")
 */

export function formatTimeToAMPM(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // Already in AM/PM format
  if (/am|pm/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return trimmed;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  return `${hours}:${minutes} ${ampm}`;
}

export function formatWorkingHours(workingHours, separator = ' - ') {
  if (!workingHours) return 'Not provided';

  // Handle object structure { start: "09:00", end: "18:00" }
  if (typeof workingHours === 'object') {
    const start = workingHours.start ? formatTimeToAMPM(workingHours.start) : '';
    const end = workingHours.end ? formatTimeToAMPM(workingHours.end) : '';
    if (start && end) {
      return `${start}${separator}${end}`;
    }
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return 'Not provided';
  }

  // Handle string format "09:00 - 18:00" or "09:00 to 18:00"
  if (typeof workingHours === 'string') {
    const trimmed = workingHours.trim();
    if (!trimmed || trimmed.toLowerCase() === 'not provided' || trimmed.toLowerCase() === 'null') {
      return 'Not provided';
    }

    const sep = trimmed.includes('-') ? '-' : (trimmed.toLowerCase().includes('to') ? 'to' : null);
    if (sep) {
      const parts = trimmed.split(sep).map(s => s.trim());
      const start = formatTimeToAMPM(parts[0]);
      const end = formatTimeToAMPM(parts[1]);
      if (start && end) {
        return `${start}${separator}${end}`;
      }
    }

    const singleFormatted = formatTimeToAMPM(trimmed);
    return singleFormatted || 'Not provided';
  }

  return 'Not provided';
}
