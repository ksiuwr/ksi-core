<script lang="ts" module>
  import type { Component } from 'svelte';

  export interface NavMenuItem {
    title: string;
    description: string;
    href: string;
    icon: Component;
    field?: string;
    external?: boolean;
    badge?: string;
  }
</script>

<script lang="ts">
  import { ArrowRight, ArrowUpRight } from '@lucide/svelte';

  /**
   * The panel rendered under a Navbar menu trigger (Projects, Groups, ...).
   * `compact` drops descriptions for the stacked mobile menu.
   */
  let {
    items,
    columns = 3,
    compact = false,
    moreHref,
    moreLabel = 'See more',
    onNavigate
  }: {
    items: NavMenuItem[];
    columns?: 3 | 4;
    compact?: boolean;
    moreHref?: string;
    moreLabel?: string;
    onNavigate?: () => void;
  } = $props();
</script>

<!-- Keys must not be translated text: labels are empty while hydrating in production. -->
<div
  class={[
    'grid gap-1',
    !compact && 'sm:grid-cols-2',
    !compact && (columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')
  ]}
>
  {#each items as item (item.href)}
    <a
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      onclick={onNavigate}
      class="menu-item"
      data-field={item.field}
    >
      <span class="icon-tile"><item.icon /></span>
      <span class="min-w-0">
        <span class="text-ink flex items-center gap-2 text-sm font-medium">
          {item.title}
          {#if item.badge}<span class="tag">{item.badge}</span>{/if}
          {#if item.external}<ArrowUpRight class="text-muted size-3.5" aria-hidden="true" />{/if}
        </span>
        {#if !compact}
          <span class="text-muted mt-0.5 block text-[13px] leading-snug">{item.description}</span>
        {/if}
      </span>
    </a>
  {/each}
  {#if moreHref}
    <a href={moreHref} onclick={onNavigate} class="menu-item group">
      <span class="icon-tile neutral"><ArrowRight /></span>
      <span class="text-ink flex items-center gap-1.5 text-sm font-medium">{moreLabel}</span>
    </a>
  {/if}
</div>

<style>
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 10px;
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: background-color var(--dur-fast) ease;
  }
  .menu-item:hover,
  .menu-item:focus-visible {
    background: var(--surface-muted);
  }
  .menu-item:focus-visible {
    outline-offset: -2px;
  }
</style>
