<script lang="ts">
  import '@ksi-core/ui/platform.css';
  import '@ksi-core/ui/platform-theme.css';
  import '@ksi-core/ui/platform-kit.css';
  import '$lib/auth.css';
  import { onMount } from 'svelte';
  import { initializePreferences, preferences } from '@ksi-core/ui/platform/preferences';
  import { loadLocale } from 'wuchale/load-utils';
  import '../locales/main.loader.svelte.js';

  onMount(initializePreferences);
  $effect(() => {
    loadLocale(preferences.language);
  });
  let { children } = $props();
</script>

{@render children()}
