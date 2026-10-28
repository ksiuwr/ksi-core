<script lang="ts">
  import { SunMoon } from '@lucide/svelte';
  import NestedMenu from './NestedMenu.svelte';
  import type { MenuItem } from './menu';
  import { preferences, setLanguage, setTheme, type ThemePreference } from './preferences.svelte';

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' }
  ];
  const languageOptions: { value: 'pl' | 'en'; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'pl', label: 'Polski' }
  ];
  const themeLabel = $derived(
    themeOptions.find((option) => option.value === preferences.theme)?.label ?? ''
  );
  const languageLabel = $derived(
    languageOptions.find((option) => option.value === preferences.language)?.label ?? ''
  );
  const items = $derived<MenuItem[]>([
    {
      id: 'theme',
      label: 'Theme',
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
      label: 'Language',
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

<NestedMenu label={'Appearance'} {items}>
  {#snippet trigger()}<SunMoon size={18} aria-hidden="true" />{/snippet}
</NestedMenu>
