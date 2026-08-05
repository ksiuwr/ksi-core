<script lang="ts">
  import { themeStore } from '$lib/themeStore';
  import { Moon, Sun } from '@lucide/svelte';
</script>

<button
  onclick={() => themeStore.set($themeStore === 'dark' ? 'light' : 'dark')}
  class="md:hidden flex cursor-pointer gap-3 py-2 flex-1 items-center btn btn-md"
  aria-label="Toggle theme"
>
  {#if $themeStore === 'dark'}
    <Moon class="w-4 h-4 shrink-0" />
    Dark mode
  {:else}
    <Sun class="w-4 h-4 shrink-0" />
    Light mode
  {/if}
</button>

<button
  onclick={() => themeStore.set($themeStore === 'dark' ? 'light' : 'dark')}
  class="not-md:hidden cursor-pointer w-26 h-6 text-muted hover:text-base-content transition-colors relative group overflow-hidden"
  aria-label="Toggle theme"
>
  <div
    class="absolute left-0 w-6 h-full flex items-center justify-center group-hover:rotate-12 transition-transform"
  >
    <div
      class="absolute transition-all duration-300"
      class:opacity-100={$themeStore === 'dark'}
      class:rotate-0={$themeStore === 'dark'}
      class:opacity-0={$themeStore === 'light'}
      class:rotate-90={$themeStore === 'light'}
    >
      <Moon class="w-4 h-4" />
    </div>

    <div
      class="absolute transition-all duration-300"
      class:opacity-100={$themeStore === 'light'}
      class:rotate-0={$themeStore === 'light'}
      class:opacity-0={$themeStore === 'dark'}
      class:-rotate-90={$themeStore === 'dark'}
    >
      <Sun class="w-4 h-4" />
    </div>
  </div>

  <div class="grid w-full h-full text-sm items-center justify-center pl-6">
    <p
      class="col-start-1 row-start-1 transition-all duration-450"
      class:translate-y-0={$themeStore === 'dark'}
      class:opacity-100={$themeStore === 'dark'}
      class:-translate-y-full={$themeStore === 'light'}
      class:opacity-0={$themeStore === 'light'}
    >
      Dark
    </p>

    <p
      class="col-start-1 row-start-1 transition-all duration-450"
      class:translate-y-0={$themeStore === 'light'}
      class:opacity-100={$themeStore === 'light'}
      class:translate-y-full={$themeStore === 'dark'}
      class:opacity-0={$themeStore === 'dark'}
    >
      Light
    </p>
  </div>
</button>
