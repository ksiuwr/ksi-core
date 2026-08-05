<script lang="ts">
  import ThemeButton from './ThemeButton.svelte';
  import { PanelLeft } from '@lucide/svelte';
  import { sidebarStore } from '$lib/sidebar';
  import { locale, toggleLocale } from '$lib/locale.svelte';
</script>

<nav class="fixed bottom-0 z-40 w-full px-20 pb-20 py-10 flex group">
  <div
    class="w-20 transition-all duration-1000 ease-in-out transform-gpu group-hover:w-full backdrop-blur-xl px-4 py-2 h-20 z-50 relative rounded-full overflow-hidden"
  >
    <div class="absolute left-0 top-0 w-full blur-xl">
      <div class="absolute size-16 -mt-4 h-10 bg-blue-800 z-50 duration-2000 transition-all"></div>
      <div
        class="absolute bg-blue-400/80 h-20 w-full right-0 top-20 -mt-4 blur-2xl z-40 duration-650 group-hover:blur-lg transition-all"
      ></div>
    </div>
    <div class="absolute top-0 flex w-[60vw] left-0 items-center gap-8 p-3 h-20">
      <a href="/" class="group/button rounded-full">
        <div
          class="rounded-full border border-transparent transition-all group-hover/button:scale-[0.95] duration-500 group-hover/button:border-zinc-600 group-hover/button:bg-white/10"
        >
          <img src="/logo.svg" alt="" class="size-10 dark:invert md:size-14" />
        </div>
      </a>
      <div class="group/dropdown relative">
        <button
          class="rounded-full p-2 px-4 overflow-hidden bg-linear-0 from-zinc-900 hover:bg-linear-30 hover:bg-white/20 duration-500 transition-all to-transparent cursor-pointer"
        >
          <b class="z-70">Panel</b>
        </button>
      </div>
      <b>Życie studenckie</b>
    </div>
  </div>
</nav>
<header
  class="fixed top-10 z-40 flex h-15 flex-row items-center justify-between border-b border-b-base-200 bg-base-100/95 backdrop-blur supports-backdrop-filter:bg-base-100/60"
>
  <div class="flex h-full items-center">
    <button
      onclick={() => {
        $sidebarStore = !$sidebarStore;
      }}
      class="btn btn-square btn-outline h-15 w-15 border-0 border-x rounded-none border-base-200 lg:hidden"
      aria-label="Toggle sidebar"
    >
      <PanelLeft class="size-5" />
    </button>

    <a
      href="/"
      class="flex h-full w-35 items-center gap-4 px-6 font-mono text-lg opacity-80 transition-colors hover:bg-base-200/50 md:text-2xl lg:border-r lg:border-base-200 lg:w-62.5"
    >
      <img src="/logo.svg" alt="" class="size-8 dark:invert md:size-10" />
      KSI
    </a>
  </div>

  <div class="flex h-full">
    <button
      onclick={toggleLocale}
      class="btn btn-square btn-outline h-15 w-15 rounded-none border-base-200 border-0 border-l"
      aria-label="Toggle language"
    >
      {locale.current === 'en' ? '🇺🇸' : '🇵🇱'}
    </button>
    <ThemeButton />
  </div>
</header>
