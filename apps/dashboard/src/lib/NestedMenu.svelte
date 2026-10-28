<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import MenuList from './MenuList.svelte';
  import type { MenuItem } from './menu';

  let {
    label,
    items,
    trigger,
    triggerClass = '',
    align = 'end'
  }: {
    label: string;
    items: MenuItem[];
    trigger: Snippet;
    triggerClass?: string;
    align?: 'start' | 'end';
  } = $props();

  let root = $state<HTMLSpanElement>();
  let panel = $state<HTMLDivElement>();
  let triggerElement = $state<HTMLButtonElement>();
  let open = $state(false);
  let suppressClick = false;
  const HOLD_MS = 220;

  function show() {
    open = true;
  }

  function close(focus = false) {
    open = false;
    if (focus) triggerElement?.focus();
  }

  function select(item: MenuItem) {
    close();
    item.onselect?.();
  }

  // Press, drag to an item (including through submenus) and release to pick it.
  function pressTrigger(event: PointerEvent) {
    if (event.button !== 0 || event.pointerType === 'touch' || open) return;
    let held = false;
    const holdTimer = window.setTimeout(() => {
      held = true;
      suppressClick = true;
      show();
    }, HOLD_MS);
    const cleanup = () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener('pointerup', release, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
    const release = (up: PointerEvent) => {
      cleanup();
      if (!held) return;
      const target = document.elementFromPoint(up.clientX, up.clientY);
      const action = target?.closest<HTMLElement>('.nested-menu-action');
      if (action && panel?.contains(action)) action.click();
      window.setTimeout(() => (suppressClick = false), 0);
    };
    const cancel = () => {
      cleanup();
      suppressClick = false;
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', cancel, true);
  }

  function triggerClick(event: MouseEvent) {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
      return;
    }
    if (open) close(true);
    else show();
  }

  function dismiss(event: PointerEvent) {
    if (open && root && event.target instanceof Node && !root.contains(event.target)) close();
  }

  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    close(true);
  }
</script>

<svelte:window onpointerdown={dismiss} onkeydown={escape} />

<span class="nested-menu" bind:this={root}>
  <button
    bind:this={triggerElement}
    type="button"
    class="nested-menu-trigger {triggerClass}"
    aria-label={label}
    title={label}
    aria-haspopup="menu"
    aria-expanded={open}
    onpointerdown={pressTrigger}
    onclick={triggerClick}
  >
    {@render trigger()}
  </button>

  {#if open}
    <div
      bind:this={panel}
      class="nested-menu-panel"
      class:align-end={align === 'end'}
      class:align-start={align === 'start'}
      transition:fly={{ y: -4, duration: prefersReducedMotion.current ? 0 : 140 }}
    >
      <MenuList {items} {label} side={align === 'end' ? 'left' : 'right'} onselect={select} />
    </div>
  {/if}
</span>

<style>
  .nested-menu {
    position: relative;
    display: inline-flex;
  }
  .nested-menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) ease,
      color var(--dur-fast) ease;
  }
  .nested-menu-trigger:hover,
  .nested-menu-trigger[aria-expanded='true'] {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .nested-menu-trigger:focus-visible {
    outline: none;
    border-color: var(--ring-strong);
    box-shadow: 0 0 0 3px var(--ring);
  }
  .nested-menu-panel {
    position: absolute;
    top: calc(100% + 6px);
    z-index: 50;
    min-width: 228px;
    max-width: calc(100vw - 32px);
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-md);
  }
  .nested-menu-panel.align-end {
    right: 0;
  }
  .nested-menu-panel.align-start {
    left: 0;
  }
</style>
