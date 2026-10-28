import { frontendLocales, type FrontendLocale } from 'shared/content-locales';
import { observeTheme, setThemePreference, type ThemePreference } from './theme.js';
export type { ThemePreference } from './theme.js';
export const preferences = $state({
  theme: 'system' as ThemePreference,
  language: 'pl' as FrontendLocale
});
export function setTheme(theme: ThemePreference) {
  preferences.theme = theme;
  setThemePreference(theme);
}
export function setLanguage(language: FrontendLocale) {
  preferences.language = language;
  try {
    localStorage.setItem('ksi-dashboard-language', language);
  } catch {}
  document.documentElement.lang = new Intl.Locale(language).toString();
}
export function initializePreferences() {
  const language = () => {
    try {
      const stored = localStorage.getItem('ksi-dashboard-language');
      preferences.language =
        stored === 'en'
          ? 'en-us'
          : (frontendLocales as readonly string[]).includes(stored ?? '')
            ? (stored as FrontendLocale)
            : 'pl';
    } catch {}
    document.documentElement.lang = new Intl.Locale(preferences.language).toString();
  };
  language();
  const cleanup = observeTheme((theme: ThemePreference) => (preferences.theme = theme));
  window.addEventListener('storage', language);
  return () => {
    cleanup();
    window.removeEventListener('storage', language);
  };
}
