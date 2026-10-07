<script lang="ts">
  import { page } from '$app/state';
  import { ArrowLeft, Compass } from '@lucide/svelte';
  import Wrapper from '../components/Wrapper.svelte';
</script>

<svelte:head>
  <title>{page.status} · KSI UWr</title>
</svelte:head>

<Wrapper name={`error / ${page.status}`}>
  <div
    class="border-base-content/15 grid min-h-[60vh] items-center gap-10 border-y py-16 lg:grid-cols-[0.55fr_1fr]"
  >
    <div
      class="text-base-content/10 text-[clamp(7rem,20vw,15rem)] leading-none font-bold -tracking-widest"
    >
      {page.status}
    </div>

    <div class="max-w-2xl">
      <p
        class="text-primary mb-4 flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase"
      >
        <Compass class="size-4" /> Route not resolved
      </p>
      <h1 class="mb-6! text-4xl tracking-tight md:text-6xl">This path led somewhere unexpected.</h1>
      <p class="text-base-content/65 text-lg leading-relaxed">
        {page.error?.message ||
          'The page may have moved, or something went wrong while loading it.'}
        The reliable route is back to the association — and room 24 at the Institute of Computer Science
        is always worth finding.
      </p>
      <a href="/" class="btn btn-primary mt-10 gap-2 px-6">
        <ArrowLeft class="size-4" /> Return home
      </a>
    </div>
  </div>
</Wrapper>
