const TIME_ZONE = 'America/Santiago';
const FALLBACK = '—';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// Decimals come from the catalog per parameter, so formatters are memoized per precision.
const numberFormatters = new Map<number, Intl.NumberFormat>();

function numberFormatter(decimals: number): Intl.NumberFormat {
  const cached = numberFormatters.get(decimals);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  numberFormatters.set(decimals, formatter);
  return formatter;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? FALLBACK : dateFormatter.format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? FALLBACK : dateTimeFormatter.format(date);
}

export function formatTime(value: Date | string): string {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? FALLBACK : timeFormatter.format(date);
}

export function formatNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    return FALLBACK;
  }
  return numberFormatter(decimals).format(value);
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return FALLBACK;
  }
  if (minutes < 1) {
    return '< 1 min';
  }
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours === 0) {
    return `${remainingMinutes} min`;
  }
  if (remainingMinutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${remainingMinutes} min`;
}

export function formatCensored(value: number | null, unit: string, decimals: number): string {
  if (value === null) {
    return '< LOQ';
  }
  return `${formatNumber(value, decimals)} ${unit}`;
}
