<script lang="ts">
  import { locales } from '../locales/data.js';
  import type { Locale } from '../locales/data.js';
  import { SunMoon } from '@lucide/svelte';
  import { DropdownMenu, type DropdownMenuOption } from '@astryx-sv/core';
  import { preferences, setLanguage, setTheme, type ThemePreference } from './preferences.svelte';

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Systemowy' },
    { value: 'light', label: 'Jasny' },
    { value: 'dark', label: 'Ciemny' }
  ];
  function languageName(locale: Locale) {
    const code = new Intl.Locale(locale).language;
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? locale;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  }
  const languageOptions = locales.map((locale) => ({ value: locale, label: languageName(locale) }));
  const items = $derived<DropdownMenuOption[]>([
    {
      type: 'section',
      id: 'theme',
      title: 'Motyw',
      items: themeOptions.map((option) => ({
        id: option.value,
        label: option.label,
        icon: preferences.theme === option.value ? 'check' : undefined,
        onClick: () => setTheme(option.value)
      }))
    },
    {
      type: 'section',
      id: 'language',
      title: 'Język',
      items: languageOptions.map((option) => ({
        id: option.value,
        label: option.label,
        icon: preferences.language === option.value ? 'check' : undefined,
        onClick: () => setLanguage(option.value)
      }))
    }
  ]);
</script>

{#snippet appearanceIcon()}<SunMoon size={18} aria-hidden="true" />{/snippet}

<DropdownMenu
  button={{
    label: 'Wygląd',
    variant: 'ghost',
    size: 'sm',
    isIconOnly: true,
    icon: appearanceIcon
  }}
  {items}
  menuWidth={240}
  placement="below"
  alignment="end"
/>
