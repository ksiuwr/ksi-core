<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { afterNavigate } from '$app/navigation';
  import { PanelLeftClose, PanelLeftOpen, X } from '@lucide/svelte';

  let {
    label,
    docked: savedDocked,
    children
  }: { label: string; docked: boolean; children: Snippet } = $props();
  const uid = $props.id();
  // Phones keep the bar above the content; a docked tree would push every page down.
  const narrow = new MediaQuery('(max-width: 760px)');
  let root = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let docked = $state(untrack(() => savedDocked));
  let hovered = $state(false);
  let pinned = $state(false);
  let dragging = $state(false);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  const inColumn = $derived(docked && !narrow.current);
  /** Floating over the page; a docked tree already shows everything in its column. */
  const open = $derived(!inColumn && (hovered || pinned || dragging));
  const expanded = $derived(inColumn || open);
  /** What the button toggles: the docked column on wide screens, the bar on phones. */
  const shown = $derived(inColumn || (narrow.current && open));

  /** The delays ignore a pointer crossing the button and forgive a brief slip outside. */
  function hover(next: boolean) {
    clearTimeout(hoverTimer);
    if (next && inColumn) return;
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
  function toggle() {
    if (narrow.current) {
      if (open) close();
      else pinned = true;
      return;
    }
    // Hover opens only on entry, so undocking under the pointer stays shut until it returns.
    close();
    docked = !docked;
    document.cookie = `ksi-docs-navigation=${docked ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  afterNavigate(() => close());
  onDestroy(() => clearTimeout(hoverTimer));
</script>

<svelte:window onpointerdown={outside} onkeydown={escape} ondragend={() => (dragging = false)} />

<!-- Lives in its own rail so it stays reachable without ever covering the text; docked, the
     rail widens into a column beside it. -->
<div class="docs-navigation-anchor" class:docked>
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
        aria-expanded={expanded}
        title={shown ? 'Ukryj panel boczny' : 'Pokaż panel boczny'}
        onclick={toggle}
      >
        {#if shown}<PanelLeftClose size={18} aria-hidden="true" />{:else}<PanelLeftOpen
            size={18}
            aria-hidden="true"
          />{/if}
      </button>
      <span class="floating-docs-title" aria-hidden="true">{label}</span>
      {#if open}<button
          type="button"
          class="docs-navigation-close"
          aria-label={'Zamknij nawigację'}
          onclick={() => close(true)}><X size={16} aria-hidden="true" /></button
        >{/if}
    </div>
    <div
      id={`${uid}-content`}
      class="floating-docs-content"
      inert={!expanded}
      aria-hidden={!expanded}
    >
      <div class="floating-docs-scroll">{@render children()}</div>
    </div>
  </div>
</div>

<style>
  .docs-navigation-anchor {
    --navigation-width: 320px;
    --docked-width: 264px;
    position: sticky;
    top: 16px;
    /* Above the article, below the dashboard sidebar (35), which opens over the page. */
    z-index: 30;
    width: 44px;
    height: 44px;
    transition:
      width 240ms var(--ease-out),
      margin 240ms var(--ease-out);
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
      border-color 180ms ease,
      background-color 180ms ease,
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
  /* Docked, the panel becomes the plain column: it grows to the tree's height and drops
     its border, shadow and fill, while the button stays where the rail had it. */
  @media (min-width: 761px) {
    .docs-navigation-anchor.docked {
      width: var(--docked-width);
      height: auto;
      margin-right: 12px;
    }
    .docked .floating-docs-navigation {
      position: relative;
      width: var(--docked-width);
      grid-template-rows: 42px 1fr;
      border-color: transparent;
      border-radius: var(--radius-xl);
      background-color: transparent;
      box-shadow: none;
    }
    .docked .floating-docs-title,
    .docked .floating-docs-content {
      visibility: visible;
      opacity: 1;
      transition-delay: 60ms;
    }
    .docked .floating-docs-scroll {
      width: calc(var(--docked-width) - 2px);
    }
  }
  /* Too narrow for a rail: the button becomes a full-width bar above the content. */
  @media (max-width: 760px) {
    .docs-navigation-anchor {
      --navigation-width: calc(100vw - 32px);
      position: relative;
      top: 0;
      width: auto;
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
    .docs-navigation-anchor,
    .floating-docs-navigation,
    .floating-docs-title,
    .floating-docs-content {
      transition: none;
    }
  }
</style>
