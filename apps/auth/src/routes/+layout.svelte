<script lang="ts">
  import '../app.css';
  import '$lib/auth.css';
  import { onMount } from 'svelte';
  import { Theme } from '@astryx-sv/core/theme';
  import { InternationalizationProvider } from '@astryx-sv/core/i18n';
  import en from '@astryx-sv/core/locales/en.json';
  import pl from '@astryx-sv/core/locales/pl-PL.json';
  import { neutralTheme } from '@astryx-sv/theme-neutral';
  import { initializePreferences, preferences } from '@ksi-core/ui/platform/preferences';
  import { loadLocale } from 'wuchale/load-utils';
  import '../locales/main.loader.svelte.js';

  onMount(initializePreferences);
  $effect(() => {
    loadLocale(preferences.language);
  });
  let { children } = $props();
</script>

<Theme theme={neutralTheme} mode={preferences.theme}>
  <InternationalizationProvider
    locale={preferences.language}
    messages={{ en, 'en-us': en, pl, 'pl-PL': pl }}
  >
    {@render children()}
  </InternationalizationProvider>
</Theme>
