<script lang="ts">
  import ThemeButton from './ThemeButton.svelte';
  import { PanelLeft } from '@lucide/svelte';
  import { sidebarStore } from '$lib/sidebar';
  import { locale, toggleLocale } from '$lib/locale.svelte';
</script>

<nav class="group fixed bottom-0 z-40 flex w-full px-20 py-10 pb-20">
  <div
    class="relative z-50 h-20 w-20 transform-gpu overflow-hidden rounded-full px-4 py-2 backdrop-blur-xl transition-all duration-1000 ease-in-out group-hover:w-full"
  >
    <div class="absolute top-0 left-0 w-full blur-xl">
      <div class="absolute z-50 -mt-4 size-16 h-10 bg-blue-800 transition-all duration-2000"></div>
      <div
        class="absolute top-20 right-0 z-40 -mt-4 h-20 w-full bg-blue-400/80 blur-2xl transition-all duration-650 group-hover:blur-lg"
      ></div>
    </div>
    <div class="absolute top-0 left-0 flex h-20 w-[60vw] items-center gap-8 p-3">
      <a href="/" class="group/button rounded-full">
        <div
          class="rounded-full border border-transparent transition-all duration-500 group-hover/button:scale-[0.95] group-hover/button:border-zinc-600 group-hover/button:bg-white/10"
        >
          <img src="/logo.svg" alt="" class="size-10 md:size-14 dark:invert" />
        </div>
      </a>
      <div class="group/dropdown relative">
        <button
          class="cursor-pointer overflow-hidden rounded-full bg-linear-0 from-zinc-900 to-transparent p-2 px-4 transition-all duration-500 hover:bg-white/20 hover:bg-linear-30"
        >
          <b class="z-70">Panel</b>
        </button>
      </div>
      <b>Życie studenckie</b>
    </div>
  </div>
</nav>
<header
  class="border-b-base-200 bg-base-100/95 supports-backdrop-filter:bg-base-100/60 fixed top-10 z-40 flex h-15 flex-row items-center justify-between border-b backdrop-blur"
>
  <div class="flex h-full items-center">
    <button
      onclick={() => {
        $sidebarStore = !$sidebarStore;
      }}
      class="btn btn-square btn-outline border-base-200 h-15 w-15 rounded-none border-0 border-x lg:hidden"
      aria-label="Toggle sidebar"
    >
      <PanelLeft class="size-5" />
    </button>

    <a
      href="/"
      class="hover:bg-base-200/50 lg:border-base-200 flex h-full w-35 items-center gap-4 px-6 font-mono text-lg opacity-80 transition-colors md:text-2xl lg:w-62.5 lg:border-r"
    >
      <img src="/logo.svg" alt="" class="size-8 md:size-10 dark:invert" />
      KSI
    </a>
  </div>

  <div class="flex h-full">
    <button
      onclick={toggleLocale}
      class="btn btn-square btn-outline border-base-200 h-15 w-15 rounded-none border-0 border-l"
      aria-label="Toggle language"
    >
      {locale.current === 'en' ? '🇺🇸' : '🇵🇱'}
    </button>
    <ThemeButton />
  </div>
</header>
