<script lang="ts">
  import '../app.css';
  import { onMount, untrack } from 'svelte';
  import { invalidate } from '$app/navigation';
  import Navbar from '../components/Navbar.svelte';
  import Footer from '../components/Footer.svelte';
  import { Toaster } from 'svelte-sonner';
  import { themeStore } from '@ksi-core/ui/lib';
  import Alert from '../components/Alert.svelte';
  import '../locales/main.loader.svelte.js';
  import { locale, observeLocalePreference, refreshLocalizedContent } from '$lib/locale.svelte';

  onMount(themeStore.initialize);
  onMount(observeLocalePreference);
  onMount(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void invalidate('ksi:alert');
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  });
  $effect(() => {
    const current = locale.current;
    untrack(() => void refreshLocalizedContent(current));
  });

  const { children, data } = $props();
</script>

<svelte:head>
  <title>KSI UWr</title>
</svelte:head>

<Toaster theme={$themeStore} richColors />

<div class="flex min-h-screen flex-col">
  {#if data.alert}
    <Alert alert={data.alert} />
  {/if}
  <Navbar user={data.user} session={data.session} />

  <div class="flex flex-1 flex-col">
    {@render children?.()}
  </div>
  <Footer />
</div>
