<script lang="ts">
  import { page } from '$app/stores';
  import { ChevronDown } from '@lucide/svelte';
  import { cn } from '$lib/utils';
  import type { Snippet } from 'svelte';

  let {
    title,
    href,
    exact = false,
    children
  }: {
    title: string;
    href?: string;
    exact?: boolean;
    children: Snippet;
  } = $props();

  let expanded = $state(true);

  let isActive = $derived(
    href ? (exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href)) : false
  );
</script>

<div class="flex flex-col gap-0.5">
  {#if href}
    <!-- Clickable title row: link + separate chevron toggle -->
    <div class="flex items-center gap-1">
      <a
        {href}
        class={cn(
          'flex flex-1 items-center rounded-lg px-3 py-3 text-base font-medium transition-colors duration-150',
          isActive
            ? 'bg-primary/15 text-primary font-semibold'
            : 'hover:bg-base-200 text-base-content/80 hover:text-base-content'
        )}
      >
        {title}
      </a>
      <button
        type="button"
        onclick={() => (expanded = !expanded)}
        class="btn btn-ghost btn-square btn-sm shrink-0"
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        <ChevronDown
          class={cn(
            'size-4 transition-transform duration-200',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
    </div>
  {:else}
    <!-- Plain section label -->
    <p
      class="text-base-content/40 px-3 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase select-none"
    >
      {title}
    </p>
  {/if}

  {#if expanded}
    <div class="flex flex-col gap-0.5 pl-3">
      {@render children()}
    </div>
  {/if}
</div>
