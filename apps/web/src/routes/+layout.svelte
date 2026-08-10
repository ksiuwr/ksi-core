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

{#if data.alert}
  <div class="w-full lg:hidden">
    <Alert alert={data.alert} />
  </div>
{/if}
<Navbar user={data.user} alert={data.alert} session={data.session} />
<div class="mx-auto flex min-h-screen flex-col gap-px lg:max-w-360 lg:gap-4">
  <div class="bg-base-100 flex flex-1 flex-col">
    <Sidebar user={data.user} session={data.session} />

    <div class="relative flex flex-1 items-start">
      <main id="main-content" class="w-full min-w-0 flex-1 px-4 py-8 sm:px-6 md:py-12 lg:px-12">
        {@render children?.()}
      </main>
    </div>
  </div>
</div>
<Footer />
