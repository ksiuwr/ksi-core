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

<section class={cn('text-base-content mx-auto w-full max-w-7xl', className)}>
  <nav
    aria-label="Breadcrumb"
    class="text-base-content/45 mb-10 flex items-center gap-3 text-xs font-bold tracking-[0.16em] uppercase"
  >
    <a href="/" class="text-primary shrink-0 transition-opacity hover:opacity-60" aria-label="Home">
      {#if icon}
        {@render icon()}
      {:else}
        <Route class="size-4" />
      {/if}
    </a>

    <div class="flex min-w-0 items-center gap-2 overflow-hidden">
      {#each breadcrumbs as breadcrumb, index (breadcrumb.label)}
        {#if index > 0}
          <ChevronRight class="text-base-content/20 size-3 shrink-0" />
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
            class={index === breadcrumbs.length - 1 ? 'text-primary truncate' : 'truncate'}
            aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
          >
            {breadcrumb.label}
          </span>
        {/if}
      {/each}
    </div>
    <span class="bg-base-content/15 h-px flex-1"></span>
  </nav>

  {@render children()}
</section>
