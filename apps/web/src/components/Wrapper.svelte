<script lang="ts">
  import type { Snippet } from 'svelte';
  import { BreadcrumbItem, Breadcrumbs, VStack } from '@astryx-sv/core';
  import { cn } from '$lib/utils';
  let {
    name,
    hero,
    class: className,
    children
  }: {
    name: string;
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

<VStack as="main" gap={0} width="100%" class={cn('flex-1', className)}>
  <VStack as="section" gap={10} paddingBlock={6} class="bg-surface page-container w-full">
    <Breadcrumbs label="Okruszki nawigacyjne" variant="supporting" class="tracking-wider uppercase">
      {#each breadcrumbs as breadcrumb, index (breadcrumb.label)}
        <BreadcrumbItem
          href={index < breadcrumbs.length - 1 ? breadcrumb.href : undefined}
          isCurrent={index === breadcrumbs.length - 1}
        >
          {breadcrumb.label}
        </BreadcrumbItem>
      {/each}
    </Breadcrumbs>

    {#if hero}
      {@render hero()}
    {/if}
  </VStack>

  <VStack as="section" gap={0} paddingBlock={10} class="page-container w-full flex-1">
    {@render children()}
  </VStack>
</VStack>
