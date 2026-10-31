import {
  validTheme,
  themeFromCookie,
  themeCookieDomain,
  type ThemePreference
} from 'shared/theme-policy.ts';
import { preferenceCookieRemoval } from 'shared/preference-cookie.ts';
export type { ThemePreference } from 'shared/theme-policy.ts';
function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function readTheme(): ThemePreference {
  const cookie = themeFromCookie(document.cookie);
  if (cookie) return cookie;
  const stored =
    readStorage('ksi-theme') ?? readStorage('ksi-dashboard-theme') ?? readStorage('theme');
  return validTheme(stored) ? stored : 'system';
}
function apply(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
export function setThemePreference(preference: ThemePreference) {
  if (!validTheme(preference)) return;
  try {
    localStorage.setItem('ksi-theme', preference);
  } catch {}
  const removal = preferenceCookieRemoval('ksi-theme', location.hostname);
  if (removal) document.cookie = removal;
  const domain = themeCookieDomain(location.hostname);
  document.cookie = `ksi-theme=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${location.protocol === 'https:' ? '; Secure' : ''}`;
  apply(preference);
  window.dispatchEvent(new Event('ksi-theme-change'));
}
/** Pre-domain builds left a host-only cookie that shadows the shared one. */
function migrateLegacyThemeCookie() {
  const removal = preferenceCookieRemoval('ksi-theme', location.hostname);
  if (!removal) return;
  const seen = themeFromCookie(document.cookie);
  document.cookie = removal;
  if (themeFromCookie(document.cookie)) return;
  if (validTheme(seen)) setThemePreference(seen);
}
export function observeTheme(callback: (theme: ThemePreference) => void) {
  migrateLegacyThemeCookie();
  const sync = () => {
    const theme = readTheme();
    apply(theme);
    callback(theme);
  };
  if (!themeFromCookie(document.cookie)) setThemePreference(readTheme());
  sync();
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', sync);
  for (const event of ['storage', 'focus', 'pageshow', 'ksi-theme-change'])
    window.addEventListener(event, sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    media.removeEventListener('change', sync);
    for (const event of ['storage', 'focus', 'pageshow', 'ksi-theme-change'])
      window.removeEventListener(event, sync);
    document.removeEventListener('visibilitychange', sync);
  };
}
