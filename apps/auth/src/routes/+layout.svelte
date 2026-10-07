<script lang="ts">
  import '../app.css';
  import { Toaster } from 'svelte-sonner';
  import { themeStore } from '@ksi-core/ui/lib';
  import { loadLocale } from 'wuchale/load-utils';
  import '../locales/main.loader.svelte.js';
  import { locale } from '$lib/locale.svelte';
  import Footer from '../components/Footer.svelte';

  $effect(() => {
    loadLocale(locale.current);
  });

  const { children, data } = $props();
</script>

<svelte:head>
  <title>KSI Auth</title>
</svelte:head>

<Toaster theme={$themeStore} richColors />

<div class="mx-auto flex min-h-screen flex-col gap-px lg:max-w-360 lg:gap-4">
  <div class="bg-base-100 relative flex flex-1 flex-col">
    <div class="flex flex-1 items-start">
      <main id="main-content" class="w-full min-w-0 flex-1">
        {@render children?.()}
      </main>
    </div>
    <Footer />
  </div>
</div>
