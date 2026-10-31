<script lang="ts">
  import { locales } from '../locales/data.js';
  import type { Locale } from '../locales/data.js';
  import { SunMoon } from '@lucide/svelte';
  import NestedMenu from './NestedMenu.svelte';
  import type { MenuItem } from './menu';
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
  const themeLabel = $derived(
    themeOptions.find((option) => option.value === preferences.theme)?.label ?? ''
  );
  const languageLabel = $derived(
    languageOptions.find((option) => option.value === preferences.language)?.label ?? ''
  );
  const items = $derived<MenuItem[]>([
    {
      id: 'theme',
      label: 'Motyw',
      value: themeLabel,
      children: themeOptions.map((option) => ({
        id: option.value,
        label: option.label,
        checked: preferences.theme === option.value,
        onselect: () => setTheme(option.value)
      }))
    },
    {
      id: 'language',
      label: 'Język',
      value: languageLabel,
      children: languageOptions.map((option) => ({
        id: option.value,
        label: option.label,
        checked: preferences.language === option.value,
        onselect: () => setLanguage(option.value)
      }))
    }
  ]);
</script>

<NestedMenu label={'Wygląd'} {items}>
  {#snippet trigger()}<SunMoon size={18} aria-hidden="true" />{/snippet}
</NestedMenu>
