import type { FrontendLocale } from './content-locales.js';

export function formatDate(
  value: string | number | Date,
  locale: FrontendLocale,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(value).toLocaleDateString(locale, options);
}

export function formatDateTime(
  value: string | number | Date,
  locale: FrontendLocale,
  options?: Intl.DateTimeFormatOptions
) {
  return new Date(value).toLocaleString(locale, options);
}

export function formatRelativeTime(
  value: string | number | Date,
  locale: FrontendLocale,
  now = Date.now(),
  style: Intl.RelativeTimeFormatStyle = 'long'
) {
  const seconds = (new Date(value).getTime() - now) / 1000;
  const abs = Math.abs(seconds);
  const [divisor, unit]: [number, Intl.RelativeTimeFormatUnit] =
    abs < 60
      ? [1, 'second']
      : abs < 3600
        ? [60, 'minute']
        : abs < 86400
          ? [3600, 'hour']
          : abs < 604800
            ? [86400, 'day']
            : abs < 2592000
              ? [604800, 'week']
              : abs < 31536000
                ? [2592000, 'month']
                : [31536000, 'year'];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style }).format(
    abs < 60 ? 0 : Math.trunc(seconds / divisor),
    unit
  );
}
