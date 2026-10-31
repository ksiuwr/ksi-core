<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';
  let {
    name,
    hero,
    class: className,
    children
  }: {
    name: string;
    icon?: Snippet;
    hero?: Snippet;
    class?: string;
    children: Snippet;
  } = $props();

  const breadcrumbRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    projects: '/projects',
    'projects / ml': '/projects/ml',
    'projects / machine learning': '/projects/ml',
    'projects / zosia': '/projects/zosia'
  };

  const segments = $derived(
    name
      .replace(/\.(md|txt)$/i, '')
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
  );

  const breadcrumbs = $derived(
    segments.map((label, index) => ({
      label,
      href: breadcrumbRoutes[
        segments
          .slice(0, index + 1)
          .join(' / ')
          .toLowerCase()
      ]
    }))
  );
</script>

<main class={cn('flex w-full flex-1 flex-col', className)}>
  <section class="page-hero bg-base-100 relative w-full">
    <div class="page-gutter page-stack-hero relative mx-auto w-full max-w-[100rem]">
      <nav
        aria-label="Okruszki nawigacyjne"
        class="text-base-content/45 mb-10 flex items-center gap-3 text-xs font-bold tracking-[0.16em] uppercase"
      >
        <span aria-hidden="true">[</span>
        <div class="flex min-w-0 items-center gap-2 overflow-hidden">
          {#each breadcrumbs as breadcrumb, index (breadcrumb.label)}
            {#if index > 0}
              <span aria-hidden="true" class="text-base-content/35">/</span>
            {/if}

            {#if index < breadcrumbs.length - 1 && breadcrumb.href}
              <a
                href={breadcrumb.href}
                class="hover:text-primary truncate transition-colors hover:underline hover:underline-offset-4"
              >
                {breadcrumb.label}
              </a>
            {:else}
              <span
                class={index === breadcrumbs.length - 1 ? 'text-base-content truncate' : 'truncate'}
                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {breadcrumb.label}
              </span>
            {/if}
          {/each}
        </div>
        <span aria-hidden="true">]</span>
      </nav>

      {#if hero}
        {@render hero()}
      {/if}
    </div>
  </section>

  <section
    class:project-content={segments[0] === 'projects'}
    class="page-content bg-base-100 relative flex-1"
  >
    <div class="page-gutter relative mx-auto w-full max-w-[100rem] py-10 lg:py-14 xl:py-20">
      {@render children()}
    </div>
  </section>
</main>

<style>
  .page-hero :global(header) {
    border: 0;
    padding-top: 0;
    padding-bottom: 0;
  }

  .page-hero :global(h1) {
    font-size: clamp(2.25rem, 6vw, 6rem);
    line-height: 1.08 !important;
    letter-spacing: -0.045em;
    text-wrap: balance;
    margin-bottom: 0;
  }

  .page-hero :global(p.text-primary),
  .page-hero :global(p.text-secondary),
  .page-hero :global(p.text-accent) {
    color: var(--color-base-content);
  }

  .page-content :global(a.group) {
    transition:
      background-color 220ms ease,
      color 220ms ease;
  }

  .page-content :global(a.group:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
  }
</style>
