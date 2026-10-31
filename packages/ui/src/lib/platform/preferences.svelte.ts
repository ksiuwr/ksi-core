import {
  defaultFrontendLocale,
  frontendLocale,
  frontendLocaleFromCookie,
  type FrontendLocale
} from 'shared/content-locales';
import { preferenceCookie } from 'shared/preference-cookie';
import { observeTheme, setThemePreference, type ThemePreference } from './theme.js';
export type { ThemePreference } from './theme.js';

const languageStorageKey = 'locale';
const legacyLanguageStorageKey = 'ksi-dashboard-language';
const languageEvents = ['storage', 'focus', 'pageshow', 'ksi-locale-change'] as const;

export const preferences = $state({
  theme: 'system' as ThemePreference,
  language: defaultFrontendLocale as FrontendLocale
});

export function setTheme(theme: ThemePreference) {
  preferences.theme = theme;
  setThemePreference(theme);
}

function storedLanguage(): FrontendLocale | null {
  try {
    return (
      frontendLocale(localStorage.getItem(languageStorageKey)) ??
      frontendLocale(localStorage.getItem(legacyLanguageStorageKey))
    );
  } catch {
    return null;
  }
}

/** The shared cookie wins so every KSI frontend follows the last chosen locale. */
function preferredLanguage(): FrontendLocale {
  return frontendLocaleFromCookie(document.cookie) ?? storedLanguage() ?? defaultFrontendLocale;
}

function applyLanguage(language: FrontendLocale) {
  document.documentElement.lang = new Intl.Locale(language).toString();
}

export function setLanguage(language: FrontendLocale) {
  preferences.language = language;
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {}
  document.cookie = preferenceCookie(
    'locale',
    language,
    location.hostname,
    location.protocol === 'https:'
  );
  applyLanguage(language);
  window.dispatchEvent(new Event('ksi-locale-change'));
}

export function initializePreferences() {
  const sync = () => {
    const language = preferredLanguage();
    if (language === preferences.language) return;
    preferences.language = language;
    applyLanguage(language);
    window.dispatchEvent(new Event('ksi-locale-change'));
  };
  const bootstrap = preferredLanguage();
  preferences.language = bootstrap;
  applyLanguage(bootstrap);
  // Rewrite on load so a legacy host-only cookie becomes the shared KSI cookie.
  document.cookie = preferenceCookie(
    'locale',
    bootstrap,
    location.hostname,
    location.protocol === 'https:'
  );
  const cleanupTheme = observeTheme((theme: ThemePreference) => (preferences.theme = theme));
  for (const event of languageEvents) window.addEventListener(event, sync);
  document.addEventListener('visibilitychange', sync);
  return () => {
    cleanupTheme();
    for (const event of languageEvents) window.removeEventListener(event, sync);
    document.removeEventListener('visibilitychange', sync);
  };
}
