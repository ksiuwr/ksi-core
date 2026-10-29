<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowLeft } from '@lucide/svelte';
</script>

<svelte:head>
  <title>{page.status} · KSI UWr</title>
</svelte:head>

<main class="error-page relative isolate flex flex-1 items-center overflow-hidden">
  <div class="page-container py-20">
    <div class="mx-auto flex max-w-xl flex-col items-center text-center">
      <p
        class="status font-display text-[clamp(7rem,20vw,11rem)] leading-none font-bold tracking-[-0.06em]"
        aria-hidden="true"
      >
        {page.status}
      </p>
      <h1 class="mt-4 text-[clamp(28px,5vw,40px)] tracking-tight">We couldn't load this page.</h1>
      <p class="text-muted mt-3 text-lg leading-relaxed">Try again or return to the home page.</p>
      <a href={resolve('/')} class="btn btn-lg mt-8">
        <ArrowLeft /> Return home
      </a>
      <p
        class="border-line bg-surface text-muted mt-10 rounded-lg border px-3 py-2 font-mono text-xs wrap-anywhere"
      >
        {page.error?.message ||
          'The page may have moved, or something went wrong while loading it.'}
      </p>
    </div>
  </div>
</main>

<style>
  .error-page::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(
      color-mix(in oklch, var(--ink) 14%, transparent) 1px,
      transparent 1px
    );
    background-size: 22px 22px;
    mask-image: radial-gradient(ellipse 50% 50% at 50% 40%, #000, transparent 80%);
  }
  .status {
    background: linear-gradient(
      to bottom,
      var(--ink),
      color-mix(in oklch, var(--ink) 8%, transparent)
    );
    background-clip: text;
    color: transparent;
  }
</style>
