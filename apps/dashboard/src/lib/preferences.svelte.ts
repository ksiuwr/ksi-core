import { invalidate } from '$app/navigation';
import type { FrontendLocale } from 'shared/content-locales';
import {
  preferences,
  setTheme,
  setLanguage as setUiLanguage,
  initializePreferences as initializeUiPreferences,
  type ThemePreference
} from '@ksi-core/ui/platform/preferences';

export { preferences, setTheme, type ThemePreference };

const languageEvents = ['ksi-locale-change', 'storage', 'focus', 'pageshow'] as const;
let appliedLanguage: FrontendLocale = preferences.language;

export function setLanguage(language: FrontendLocale): void {
  const previous = preferences.language;
  setUiLanguage(language);
  if (language !== previous) void invalidate('ksi:localized-content');
}

export function initializePreferences() {
  const cleanupUi = initializeUiPreferences();
  appliedLanguage = preferences.language;
  const refreshLocalizedContent = () => {
    if (preferences.language === appliedLanguage) return;
    appliedLanguage = preferences.language;
    void invalidate('ksi:localized-content');
  };
  for (const event of languageEvents) window.addEventListener(event, refreshLocalizedContent);
  document.addEventListener('visibilitychange', refreshLocalizedContent);
  return () => {
    cleanupUi();
    for (const event of languageEvents) window.removeEventListener(event, refreshLocalizedContent);
    document.removeEventListener('visibilitychange', refreshLocalizedContent);
  };
}
