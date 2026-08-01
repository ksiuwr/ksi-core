import { loadLocale } from 'wuchale/load-utils';
import '../locales/main.loader.svelte.js';

function getInitialLocale(): 'en' | 'pl' {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale');
    if (saved === 'en' || saved === 'pl') return saved;

    const cookieMatch = document.cookie.match(/(?:^|; )locale=([^;]*)/);
    if (cookieMatch && (cookieMatch[1] === 'en' || cookieMatch[1] === 'pl')) {
      return cookieMatch[1] as 'en' | 'pl';
    }
  }
  return 'en';
}

export const locale = $state({ current: getInitialLocale() });

export function setLocale(newLocale: 'en' | 'pl') {
  locale.current = newLocale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }
  loadLocale(newLocale);
}

export function toggleLocale() {
  setLocale(locale.current === 'en' ? 'pl' : 'en');
}
