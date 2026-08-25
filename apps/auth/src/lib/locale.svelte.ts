import { loadLocale } from 'wuchale/load-utils';
import '../locales/main.loader.svelte.js';
import { locales } from '../locales/data.js';
import type { Locale } from '../locales/data.js';

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale');
    if (saved && (locales as string[]).includes(saved)) return saved as Locale;

    const cookieMatch = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (cookieMatch && (locales as string[]).includes(cookieMatch[1])) {
      return cookieMatch[1] as Locale;
    }
  }
  return 'en-us';
}

export const locale = $state({ current: getInitialLocale() });

export function setLocale(newLocale: Locale) {
  locale.current = newLocale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }
  void loadLocale(newLocale);
}
