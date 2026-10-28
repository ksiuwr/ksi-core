<script lang="ts">
  import { onMount } from 'svelte';
  import { SunMoon } from '@lucide/svelte';
  import Dropdown from './Dropdown.svelte';
  import { observeTheme, setThemePreference, type ThemePreference } from './theme.js';
  let preference = $state<ThemePreference>('system');

  onMount(() => observeTheme((theme) => (preference = theme)));
</script>

<div class="theme-selector">
  <Dropdown
    variant="compact"
    label={'Appearance'}
    value={preference}
    options={[
      { value: 'system', label: 'System' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' }
    ]}
    onselect={(value) => setThemePreference(value as ThemePreference)}
    >{#snippet leading()}<SunMoon size={15} aria-hidden="true" />{/snippet}</Dropdown
  >
</div>

<style>
  .theme-selector {
    min-width: 108px;
  }
  @media (max-width: 480px) {
    .theme-selector {
      min-width: 90px;
    }
  }
</style>
