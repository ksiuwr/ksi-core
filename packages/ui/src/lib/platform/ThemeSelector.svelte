<script lang="ts">
  import { onMount } from 'svelte';
  import { DropdownMenu } from '@astryx-sv/core';
  import { observeTheme, setThemePreference, type ThemePreference } from './theme.js';

  let preference = $state<ThemePreference>('system');

  onMount(() => observeTheme((theme) => (preference = theme)));

  const labels: Record<ThemePreference, string> = {
    system: 'Systemowy',
    light: 'Jasny',
    dark: 'Ciemny'
  };
</script>

<DropdownMenu
  button={{
    label: labels[preference],
    tooltip: 'Wygląd',
    variant: 'secondary',
    size: 'sm'
  }}
  items={[
    { label: 'Systemowy', onClick: () => setThemePreference('system') },
    { label: 'Jasny', onClick: () => setThemePreference('light') },
    { label: 'Ciemny', onClick: () => setThemePreference('dark') }
  ]}
/>
