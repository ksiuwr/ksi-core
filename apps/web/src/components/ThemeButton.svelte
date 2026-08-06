<script lang="ts">
  import { themeStore } from '$lib/themeStore';
  import { Moon, Sun } from '@lucide/svelte';
</script>

<button
  onclick={() => themeStore.set($themeStore === 'dark' ? 'light' : 'dark')}
  class="btn btn-md flex flex-1 cursor-pointer items-center gap-3 py-2 md:hidden"
  aria-label="Toggle theme"
>
  {#if $themeStore === 'dark'}
    <Moon class="h-4 w-4 shrink-0" />
    Dark mode
  {:else}
    <Sun class="h-4 w-4 shrink-0" />
    Light mode
  {/if}
</button>

<button
  onclick={() => themeStore.set($themeStore === 'dark' ? 'light' : 'dark')}
  class="text-muted hover:text-base-content group relative h-6 w-26 cursor-pointer overflow-hidden transition-colors not-md:hidden"
  aria-label="Toggle theme"
>
  <div
    class="absolute left-0 flex h-full w-6 items-center justify-center transition-transform group-hover:rotate-12"
  >
    <div
      class="absolute transition-all duration-300"
      class:opacity-100={$themeStore === 'dark'}
      class:rotate-0={$themeStore === 'dark'}
      class:opacity-0={$themeStore === 'light'}
      class:rotate-90={$themeStore === 'light'}
    >
      <Moon class="h-4 w-4" />
    </div>

    <div
      class="absolute transition-all duration-300"
      class:opacity-100={$themeStore === 'light'}
      class:rotate-0={$themeStore === 'light'}
      class:opacity-0={$themeStore === 'dark'}
      class:-rotate-90={$themeStore === 'dark'}
    >
      <Sun class="h-4 w-4" />
    </div>
  </div>

  <div class="grid h-full w-full items-center justify-center pl-6 text-sm">
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
