<script lang="ts">
  import '../app.css';
  import Navbar from '../components/Navbar.svelte';
  import Sidebar from '../components/Sidebar.svelte';
  import Footer from '../components/Footer.svelte';
  import { Toaster } from 'svelte-sonner';
  import { themeStore } from '$lib/themeStore';
  import Alert from '../components/Alert.svelte';
  import { loadLocale } from 'wuchale/load-utils';
  import '../locales/main.loader.svelte.js';
  import { locale } from '$lib/locale.svelte';

  $effect(() => {
    loadLocale(locale.current);
  });

  const { children, data } = $props();
</script>

<svelte:head>
  <title>KSI UWr</title>
</svelte:head>

<Toaster theme={$themeStore} richColors />

<Navbar user={data.user} session={data.session} />
<div class="mx-auto flex min-h-screen flex-col gap-px lg:gap-4 lg:max-w-360">
  {#if data.alert}
    <div class="w-full">
      <Alert alert={data.alert} />
    </div>
  {/if}

  <div class="flex flex-1 flex-col bg-base-100">
    <Sidebar user={data.user} session={data.session} />

    <div class="relative flex flex-1 items-start">
      <main id="main-content" class="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-12 py-8 md:py-12">
        {@render children?.()}
      </main>
    </div>
  </div>
</div>
<Footer />
