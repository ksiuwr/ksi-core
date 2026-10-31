import { invalidate } from '$app/navigation';
import { loadLocale } from 'wuchale/load-utils';
import '../locales/main.loader.svelte.js';
import type { Locale } from '../locales/data.js';
import {
  defaultFrontendLocale,
  frontendLocale,
  frontendLocaleFromCookie
} from 'shared/content-locales';
import { preferenceCookie } from 'shared/preference-cookie';

const languageEvents = ['storage', 'focus', 'pageshow', 'ksi-locale-change'] as const;

function storedLocale(): Locale | null {
  try {
    return frontendLocale(localStorage.getItem('locale'));
  } catch {
    return null;
  }
}

/** The shared cookie wins so every KSI frontend follows the last chosen locale. */
function preferredLocale(): Locale {
  return frontendLocaleFromCookie(document.cookie) ?? storedLocale() ?? defaultFrontendLocale;
}

function persist(newLocale: Locale) {
  try {
    localStorage.setItem('locale', newLocale);
  } catch {}
  document.cookie = preferenceCookie(
    'locale',
    newLocale,
    location.hostname,
    location.protocol === 'https:'
  );
  document.documentElement.lang = new Intl.Locale(newLocale).toString();
}

export const locale = $state({
  current: typeof window === 'undefined' ? defaultFrontendLocale : preferredLocale()
});

export function setLocale(newLocale: Locale) {
  locale.current = newLocale;
  if (typeof window === 'undefined') return;
  persist(newLocale);
  window.dispatchEvent(new Event('ksi-locale-change'));
}

// The layout subscribes to this store, including locale restored from the shared cookie.
// Persist before invalidation so server loads use the same locale as the UI.
export async function refreshLocalizedContent(newLocale: Locale) {
  if (typeof window !== 'undefined') persist(newLocale);
  await Promise.all([loadLocale(newLocale), invalidate('ksi:localized-content')]);
}

/** Re-read the shared cookie when another KSI frontend changes the locale. */
export function observeLocalePreference() {
  const sync = () => {
    const preferred = preferredLocale();
    if (preferred !== locale.current) locale.current = preferred;
  };
  for (const event of languageEvents) window.addEventListener(event, sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    for (const event of languageEvents) window.removeEventListener(event, sync);
    document.removeEventListener('visibilitychange', sync);
  };
}
