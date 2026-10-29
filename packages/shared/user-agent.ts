export interface UserAgentSummary {
  browser: string | null;
  os: string | null;
}

// Order matters: Chromium-based browsers also claim Chrome and Safari, and every
// Chrome UA claims Safari, so the more specific tokens are checked first.
const browsers: [name: string, pattern: RegExp][] = [
  ['Edge', /\b(?:Edg|EdgA|EdgiOS|Edge)\//],
  ['Opera', /\b(?:OPR|OPiOS|Opera)\//],
  ['Samsung Internet', /\bSamsungBrowser\//],
  ['Firefox', /\b(?:Firefox|FxiOS)\//],
  ['Chrome', /\b(?:HeadlessChrome|Chrome|CriOS)\//],
  ['Safari', /\bVersion\/[\d.]+.*\bSafari\//]
];

// iOS and iPadOS claim to be "like Mac OS X"; Android and ChromeOS claim Linux.
const systems: [name: string, pattern: RegExp][] = [
  ['Windows', /\bWindows\b/],
  ['iPadOS', /\biPad\b|Macintosh.*\bMobile\//],
  ['iOS', /\b(?:iPhone|iPod)\b/],
  ['Android', /\bAndroid\b/],
  ['ChromeOS', /\bCrOS\b/],
  ['macOS', /\bMacintosh\b|\bMac OS X\b/],
  ['Linux', /\bLinux\b|\bX11\b/]
];

const match = (value: string, patterns: [string, RegExp][]) =>
  patterns.find(([, pattern]) => pattern.test(value))?.[0] ?? null;

/**
 * Names the browser and operating system in a User-Agent header for display.
 * Anything that is not a browser, including server runtimes such as `Bun/1.x`
 * recorded by older frontend proxies, yields nulls so it can be shown as an
 * unknown browser.
 */
export function summarizeUserAgent(userAgent: string | null | undefined): UserAgentSummary {
  const value = userAgent?.trim() ?? '';
  if (!value.startsWith('Mozilla/')) return { browser: null, os: null };
  return { browser: match(value, browsers), os: match(value, systems) };
}
