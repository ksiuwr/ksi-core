<script lang="ts">
  import { page } from '$app/stores';
  import { cn } from '$lib/utils';
  import type { Component } from 'svelte';

  let {
    href,
    icon: Icon,
    children,
    exact = true
  }: {
    href: string;
    icon?: Component<any>;
    children?: any;
    exact?: boolean;
  } = $props();

  let isActive = $derived(
    exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href)
  );
</script>

<a
  {href}
  class={cn(
    'flex w-full items-center gap-3.5 rounded-lg px-3 py-3 text-base font-medium transition-colors duration-150',
    isActive
      ? 'bg-primary/15 text-primary font-semibold'
      : 'hover:bg-base-200 text-base-content/80 hover:text-base-content'
  )}
>
  {#if Icon}
    <Icon class="size-5 shrink-0" />
  {/if}
  <span class="truncate">
    {@render children?.()}
  </span>
</a>
