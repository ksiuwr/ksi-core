import { invalidate } from '$app/navigation';
import { loadLocale } from 'wuchale/load-utils';
import '../locales/main.loader.svelte.js';
import { locales } from '../locales/data.js';
import type { Locale } from '../locales/data.js';
import { defaultFrontendLocale } from 'shared/content-locales';

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale');
    if (saved && (locales as string[]).includes(saved)) return saved as Locale;

    const cookieMatch = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (cookieMatch && (locales as string[]).includes(cookieMatch[1])) {
      return cookieMatch[1] as Locale;
    }
  }
  return defaultFrontendLocale;
}

export const locale = $state({ current: getInitialLocale() });

export function setLocale(newLocale: Locale) {
  locale.current = newLocale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

// The layout subscribes to this store, including locale restored from localStorage.
// Persist before invalidation so server loads use the same locale as the UI.
export async function refreshLocalizedContent(newLocale: Locale) {
  document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  await Promise.all([loadLocale(newLocale), invalidate('ksi:localized-content')]);
}
