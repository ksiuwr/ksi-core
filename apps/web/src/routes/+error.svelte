<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { ArrowLeft } from '@lucide/svelte';
</script>

<svelte:head>
  <title>{page.status} · KSI UWr</title>
</svelte:head>

<main class="bg-base-100 flex min-h-[calc(100vh-56px)] w-full flex-col justify-center">
  <div class="mx-auto w-full max-w-225 px-5 py-15">
    <div class="flex flex-wrap items-center gap-10">
      <div class="flex min-w-75 flex-1 flex-col gap-4">
        <h1
          class="font-anybody text-base-content mb-5 text-[clamp(40px,8vw,64px)] leading-[1.1] font-bold tracking-tight"
        >
          We couldn't load this page.
        </h1>
        <p class="text-base-content/70 mb-8 max-w-150 text-[18px] leading-relaxed">
          Try again or return to the home page.
        </p>
        <div class="flex flex-wrap gap-3">
          <a href={resolve('/')} class="btn gap-2">
            <ArrowLeft class="size-4" /> Return home
          </a>
        </div>

        <p class="text-base-content/40 max-w-150 font-mono text-sm">
          {page.error?.message ||
            'The page may have moved, or something went wrong while loading it.'}
        </p>
      </div>
      <div class="flex min-w-75 flex-1 justify-center md:justify-end">
        <div
          class="text-base-content/5 font-anybody text-[clamp(10rem,20vw,15rem)] leading-none font-bold tracking-tighter"
        >
          {page.status}
        </div>
      </div>
    </div>
  </div>
</main>
