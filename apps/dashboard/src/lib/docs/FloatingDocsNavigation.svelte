<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { PanelLeft, X } from '@lucide/svelte';

  let { label, children }: { label: string; children: Snippet } = $props();
  const uid = $props.id();
  let root = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let hovered = $state(false);
  let pinned = $state(false);
  let dragging = $state(false);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  const open = $derived(hovered || pinned || dragging);

  /** The delays ignore a pointer crossing the button and forgive a brief slip outside. */
  function hover(next: boolean) {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => (hovered = next), next ? 120 : 240);
  }
  function close(restoreFocus = false) {
    clearTimeout(hoverTimer);
    hovered = false;
    pinned = false;
    if (restoreFocus) trigger?.focus();
  }
  function outside(event: PointerEvent) {
    if (open && event.target instanceof Node && !root?.contains(event.target)) close();
  }
  function escape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open || event.defaultPrevented || dragging) return;
    // Native dialogs and dropdowns inside the tree get the first Escape.
    if (document.querySelector('dialog[open], [popover]:popover-open')) return;
    event.preventDefault();
    close(true);
  }
  afterNavigate(() => close());
  onDestroy(() => clearTimeout(hoverTimer));
</script>

<svelte:window onpointerdown={outside} onkeydown={escape} ondragend={() => (dragging = false)} />

<!-- Lives in its own rail so it stays reachable without ever covering the text. -->
<div class="docs-navigation-anchor">
  <div
    bind:this={root}
    class="floating-docs-navigation"
    class:open
    role="group"
    aria-label={label}
    onpointerenter={(event) => {
      if (event.pointerType === 'mouse') hover(true);
    }}
    onpointerleave={() => hover(false)}
    onfocusout={(event) => {
      if (event.relatedTarget instanceof Node && !root?.contains(event.relatedTarget))
        pinned = false;
    }}
    ondragstart={() => (dragging = true)}
  >
    <div class="floating-docs-header">
      <button
        bind:this={trigger}
        type="button"
        class="docs-navigation-trigger"
        aria-label={label}
        aria-controls={`${uid}-content`}
        aria-expanded={open}
        onclick={() => {
          if (open) close();
          else pinned = true;
        }}
      >
        <PanelLeft size={18} aria-hidden="true" />
      </button>
      <span class="floating-docs-title" aria-hidden="true">{label}</span>
      {#if open}<button
          type="button"
          class="docs-navigation-close"
          aria-label={'Close navigation'}
          onclick={() => close(true)}><X size={16} aria-hidden="true" /></button
        >{/if}
    </div>
    <div id={`${uid}-content`} class="floating-docs-content" inert={!open} aria-hidden={!open}>
      <div class="floating-docs-scroll">{@render children()}</div>
    </div>
  </div>
</div>

<style>
  .docs-navigation-anchor {
    --navigation-width: 320px;
    position: sticky;
    top: 16px;
    z-index: 45;
    height: 44px;
  }
  .floating-docs-navigation {
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    grid-template-rows: 42px 0fr;
    width: 44px;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 22px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-sm);
    transition:
      width 220ms var(--ease-out),
      grid-template-rows 240ms var(--ease-out),
      border-radius 220ms var(--ease-out),
      box-shadow 180ms ease;
  }
  .floating-docs-navigation.open {
    width: var(--navigation-width);
    grid-template-rows: 42px 1fr;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
  }
  .floating-docs-header {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .docs-navigation-trigger {
    display: grid;
    place-items: center;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .docs-navigation-trigger:hover,
  .docs-navigation-trigger[aria-expanded='true'] {
    color: var(--ink);
  }
  .docs-navigation-trigger:focus-visible {
    outline: 2px solid var(--ring-strong);
    outline-offset: -7px;
    border-radius: var(--radius-xl);
  }
  .docs-navigation-close:focus-visible {
    outline: 2px solid var(--ring-strong);
    outline-offset: -2px;
  }
  .floating-docs-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    opacity: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 500;
    transition: opacity 120ms ease;
  }
  .open .floating-docs-title {
    opacity: 1;
    transition-delay: 60ms;
  }
  .docs-navigation-close {
    display: none;
    place-items: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    margin-right: 7px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .docs-navigation-close:hover {
    color: var(--ink);
    background: var(--surface-muted);
  }
  /* With a mouse the button itself closes the panel; a touch target needs an explicit one. */
  @media (hover: none) {
    .docs-navigation-close {
      display: grid;
    }
  }
  .floating-docs-content {
    min-height: 0;
    overflow: hidden;
    visibility: hidden;
    opacity: 0;
    transition: opacity 120ms ease;
  }
  .open .floating-docs-content {
    visibility: visible;
    opacity: 1;
    transition-delay: 60ms;
  }
  .floating-docs-scroll {
    width: calc(var(--navigation-width) - 2px);
    /* Fits below the top bar at the top of a page, which is the lowest this panel starts. */
    max-height: max(0px, calc(100dvh - 160px));
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 2px 8px 8px;
  }
  /* Too narrow for a rail: the button becomes a full-width bar above the content. */
  @media (max-width: 760px) {
    .docs-navigation-anchor {
      --navigation-width: calc(100vw - 32px);
      position: relative;
      top: 0;
      margin-bottom: 20px;
    }
    .floating-docs-navigation,
    .floating-docs-navigation.open {
      width: 100%;
      border-radius: var(--radius-lg);
    }
    .floating-docs-title {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .floating-docs-navigation,
    .floating-docs-title,
    .floating-docs-content {
      transition: none;
    }
  }
</style>
