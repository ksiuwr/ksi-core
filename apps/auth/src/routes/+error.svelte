<script lang="ts">
  import { page } from '$app/state';
  import { ArrowLeft, Compass } from '@lucide/svelte';
</script>

<svelte:head>
  <title>{page.status} · KSI UWr</title>
</svelte:head>

<div class="border-base-content/15 flex h-screen flex-col items-center justify-center gap-10">
  <div class="max-w-2xl">
    <h1 class="mb-6! text-2xl tracking-tight md:text-4xl">
      {page.status} · This path led somewhere unexpected.
    </h1>
    <p class="text-base-content/65 text-lg leading-relaxed">
      {page.error?.message || 'The page may have moved, or something went wrong while loading it.'}
    </p>
    <a href="/" class="btn btn-primary mt-10 w-full gap-2 px-6">
      <ArrowLeft class="size-4" /> Return home
    </a>
  </div>
</div>
