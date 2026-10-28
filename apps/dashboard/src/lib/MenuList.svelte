<script lang="ts">
  import { Check, ChevronRight } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import MenuList from './MenuList.svelte';
  import type { MenuItem } from './menu';

  let {
    items,
    side = 'right',
    onselect,
    label
  }: {
    items: MenuItem[];
    side?: 'left' | 'right';
    onselect: (item: MenuItem) => void;
    label?: string;
  } = $props();

  let openChild = $state<string | null>(null);
  let closeTimer: number | undefined;
  let openTimer: number | undefined;

  function cancelClose() {
    if (closeTimer) window.clearTimeout(closeTimer);
    closeTimer = undefined;
  }

  function cancelOpen() {
    if (openTimer) window.clearTimeout(openTimer);
    openTimer = undefined;
  }

  // Give the pointer time to cross a sibling row on its way to an open flyout.
  function enter(item: MenuItem) {
    if (!item.children?.length || item.disabled) return;
    cancelClose();
    if (openChild === item.id) return;
    cancelOpen();
    openTimer = window.setTimeout(() => {
      openChild = item.id;
      openTimer = undefined;
    }, 180);
  }

  function leave() {
    cancelOpen();
    cancelClose();
    closeTimer = window.setTimeout(() => {
      openChild = null;
      closeTimer = undefined;
    }, 220);
  }

  function choose(item: MenuItem, event: MouseEvent) {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    if (item.children?.length) {
      cancelClose();
      cancelOpen();
      openChild = item.id;
      return;
    }
    onselect(item);
  }

  $effect(() => () => {
    cancelClose();
    cancelOpen();
  });
</script>

{#snippet row(item: MenuItem)}
  {#if item.icon}
    {@const Icon = item.icon}
    <Icon size={15} aria-hidden="true" />
  {/if}
  <span class="nested-menu-label">{item.label}</span>
  {#if item.value}<span class="nested-menu-value">{item.value}</span>{/if}
{/snippet}

<ul class="nested-menu-list" role="menu" aria-label={label}>
  {#each items as item (item.id)}
    <li role="none" class:separator-before={item.separatorBefore}>
      <div
        class="nested-menu-sub"
        role="none"
        onpointerenter={() => enter(item)}
        onpointerleave={leave}
      >
        {#if item.children?.length}
          <button
            type="button"
            class="nested-menu-action nested-menu-parent"
            class:danger={item.danger}
            aria-haspopup="menu"
            aria-expanded={openChild === item.id}
            disabled={item.disabled}
            onclick={(event) => choose(item, event)}
          >
            {@render row(item)}
            <span class="nested-menu-chevron">
              <ChevronRight size={14} aria-hidden="true" />
            </span>
          </button>
          {#if openChild === item.id}
            <div
              class="nested-menu-flyout"
              class:left={side === 'left'}
              class:right={side === 'right'}
              transition:fly={{
                x: side === 'left' ? 7 : -7,
                duration: prefersReducedMotion.current ? 0 : 120
              }}
            >
              <MenuList items={item.children} {side} {onselect} />
            </div>
          {/if}
        {:else if item.href}
          <a
            href={item.href}
            class="nested-menu-action"
            class:danger={item.danger}
            role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={item.checked}
            aria-disabled={item.disabled}
            onclick={(event) => choose(item, event)}
          >
            <span class="nested-menu-check"
              >{#if item.checked}<Check size={13} aria-hidden="true" />{/if}</span
            >
            {@render row(item)}
          </a>
        {:else}
          <button
            type="button"
            class="nested-menu-action"
            class:danger={item.danger}
            role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={item.checked}
            disabled={item.disabled}
            onclick={(event) => choose(item, event)}
          >
            <span class="nested-menu-check"
              >{#if item.checked}<Check size={13} aria-hidden="true" />{/if}</span
            >
            {@render row(item)}
          </button>
        {/if}
      </div>
    </li>
  {/each}
</ul>

<style>
  .nested-menu-list {
    min-width: 190px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li.separator-before {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px solid var(--line);
  }
  .nested-menu-sub {
    position: relative;
  }
  .nested-menu-action {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 9px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font-size: 12.5px;
    line-height: 1.4;
    text-align: left;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
  }
  .nested-menu-action:hover,
  .nested-menu-action:focus-visible,
  .nested-menu-parent[aria-expanded='true'] {
    background: var(--surface-muted);
    outline: none;
  }
  .nested-menu-action.danger {
    color: var(--danger);
  }
  .nested-menu-action:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .nested-menu-label {
    flex: 1;
  }
  .nested-menu-value {
    margin-left: auto;
    color: var(--muted);
    font-size: 11px;
  }
  .nested-menu-check {
    display: inline-flex;
    width: 13px;
    flex-shrink: 0;
    color: var(--accent);
  }
  .nested-menu-chevron {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--muted);
  }
  .nested-menu-flyout {
    position: absolute;
    top: -5px;
    z-index: 60;
    min-width: 180px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-md);
  }
  .nested-menu-flyout.left {
    right: calc(100% + 5px);
  }
  .nested-menu-flyout.right {
    left: calc(100% + 5px);
  }
  @media (max-width: 600px) {
    .nested-menu-flyout {
      position: static;
      min-width: 0;
      margin: 2px 0 4px 12px;
      padding: 2px 0 2px 8px;
      border: 0;
      border-left: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
  }
</style>
