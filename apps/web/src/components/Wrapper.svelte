<script lang="ts">
  import { ChevronRight, Route } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  let {
    name,
    icon,
    class: className,
    children
  }: {
    name: string;
    icon?: Snippet;
    class?: string;
    children: Snippet;
  } = $props();

  const breadcrumbRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    projects: '/projects',
    'projects / ml': '/projects/ml',
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

<section class={cn('mx-auto w-full max-w-7xl text-base-content', className)}>
  <nav
    aria-label="Breadcrumb"
    class="mb-10 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45"
  >
    <a href="/" class="shrink-0 text-primary transition-opacity hover:opacity-60" aria-label="Home">
      {#if icon}
        {@render icon()}
      {:else}
        <Route class="size-4" />
      {/if}
    </a>

    <div class="flex min-w-0 items-center gap-2 overflow-hidden">
      {#each breadcrumbs as breadcrumb, index (breadcrumb.label)}
        {#if index > 0}
          <ChevronRight class="size-3 shrink-0 text-base-content/20" />
        {/if}

        {#if index < breadcrumbs.length - 1 && breadcrumb.href}
          <a
            href={breadcrumb.href}
            class="truncate transition-colors hover:text-primary hover:underline hover:underline-offset-4"
          >
            {breadcrumb.label}
          </a>
        {:else}
          <span
            class={index === breadcrumbs.length - 1 ? 'truncate text-primary' : 'truncate'}
            aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
          >
            {breadcrumb.label}
          </span>
        {/if}
      {/each}
    </div>
    <span class="h-px flex-1 bg-base-content/15"></span>
  </nav>

  {@render children()}
</section>
