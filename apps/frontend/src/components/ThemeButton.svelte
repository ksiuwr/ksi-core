<script lang="ts">
  import { themeStore } from '$lib/themeStore';
  import { Moon, Sun } from '@lucide/svelte';
  import { onMount } from 'svelte';

  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  function spin(node: Element, { duration = 300, degree = 90 }) {
    return {
      duration: mounted ? duration : 0,
      css: (t: number) => `
        transform: rotate(${degree * (1 - t)}deg);
        opacity: ${t};
      `
    };
  }
</script>

<button
  onclick={() => {
    const newTheme = $themeStore === 'dark' ? 'light' : 'dark';
    themeStore.set(newTheme);
  }}
  class="btn btn-square btn-outline size-15 border-0 border-base-200 border-l rounded-none relative overflow-hidden"
  aria-label="Toggle theme"
>
  {#if $themeStore === 'dark'}
    <div
      class="absolute inset-0 flex items-center justify-center"
      in:spin={{ duration: 300, degree: -90 }}
      out:spin={{ duration: 300, degree: 90 }}
    >
      <Moon class="w-4 h-4" />
    </div>
  {:else if $themeStore === 'light'}
    <div
      class="absolute inset-0 flex items-center justify-center"
      in:spin={{ duration: 300, degree: 90 }}
      out:spin={{ duration: 300, degree: -90 }}
    >
      <Sun class="w-4 h-4" />
    </div>
  {/if}
</button>
