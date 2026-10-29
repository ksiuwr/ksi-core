import { invalidate } from '$app/navigation';
import { contentLocale, type FrontendLocale } from 'shared/content-locales';
import {
  preferences,
  setTheme,
  setLanguage as setUiLanguage,
  initializePreferences as initializeUiPreferences,
  type ThemePreference
} from '@ksi-core/ui/platform/preferences';
import { dashboardContentLocale } from './content-locale';

export { preferences, setTheme, type ThemePreference };

const languageStorageKey = 'ksi-dashboard-language';

function languageCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )locale=([^;]*)/);
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

/** Keep the server content locale in sync with the dashboard language preference. */
function syncContentLocale(language: FrontendLocale): void {
  if (typeof document === 'undefined') return;
  const previous = languageCookie();
  document.cookie = `locale=${language}; path=/; max-age=31536000; SameSite=Lax`;
  if (dashboardContentLocale(previous) !== contentLocale(language))
    void invalidate('ksi:localized-content');
}

export function setLanguage(language: FrontendLocale): void {
  setUiLanguage(language);
  syncContentLocale(language);
}

export function initializePreferences() {
  const cleanup = initializeUiPreferences();
  syncContentLocale(preferences.language);
  const syncStoredLanguage = (event: StorageEvent) => {
    if (event.key === null || event.key === languageStorageKey)
      syncContentLocale(preferences.language);
  };
  window.addEventListener('storage', syncStoredLanguage);
  return () => {
    cleanup();
    window.removeEventListener('storage', syncStoredLanguage);
  };
}
