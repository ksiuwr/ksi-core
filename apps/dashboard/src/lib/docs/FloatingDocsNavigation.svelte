<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { PanelLeft, X } from '@lucide/svelte';

  let { label, children }: { label: string; children: Snippet } = $props();
  const uid = $props.id();
  let anchor = $state<HTMLDivElement>();
  let root = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let hovered = $state(false);
  let focused = $state(false);
  let pinned = $state(false);
  let dragging = $state(false);
  let dismissed = $state(false);
  let ready = $state(false);
  let position = $state({ left: 16, top: 80, width: 320 });
  const open = $derived(!dismissed && (hovered || focused || pinned || dragging));

  function close(restoreFocus = false) {
    dismissed = true;
    hovered = false;
    focused = false;
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

  onMount(() => {
    if (!anchor) return;
    const body = anchor.closest('.dash-body');
    const topbar = body?.querySelector<HTMLElement>('.dash-topbar');
    function place() {
      if (!anchor) return;
      const width = Math.min(320, window.innerWidth - 24);
      position = {
        width,
        left: Math.max(
          12,
          Math.min(anchor.getBoundingClientRect().left, window.innerWidth - width - 12)
        ),
        top: Math.max(12, Math.min((topbar?.offsetHeight ?? 64) + 16, window.innerHeight - 56))
      };
      ready = true;
    }
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    if (body) observer.observe(body);
    if (topbar) observer.observe(topbar);
    window.addEventListener('resize', place);
    place();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  });
</script>

<svelte:window onpointerdown={outside} onkeydown={escape} ondragend={() => (dragging = false)} />

<div class="docs-navigation-anchor" bind:this={anchor}>
  <div
    bind:this={root}
    class="floating-docs-navigation"
    class:open
    class:ready
    role="group"
    aria-label={label}
    style:left={`${position.left}px`}
    style:top={`${position.top}px`}
    style:--navigation-width={`${position.width}px`}
    style:--navigation-top={`${position.top}px`}
    onpointerenter={(event) => {
      if (event.pointerType === 'mouse') {
        hovered = true;
        dismissed = false;
      }
    }}
    onpointerleave={() => (hovered = false)}
    onfocusin={(event) => {
      focused = true;
      if (!(event.relatedTarget instanceof Node && root?.contains(event.relatedTarget)))
        dismissed = false;
    }}
    onfocusout={(event) => {
      if (!(event.relatedTarget instanceof Node && root?.contains(event.relatedTarget))) {
        focused = false;
        pinned = false;
      }
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
          if (pinned) close(true);
          else {
            pinned = true;
            dismissed = false;
          }
        }}
      >
        <PanelLeft size={18} aria-hidden="true" />
      </button>
      <span class="floating-docs-title" aria-hidden={!open}>{label}</span>
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
    height: 44px;
    margin-bottom: 16px;
  }
  .floating-docs-navigation {
    position: fixed;
    z-index: 45;
    display: grid;
    grid-template-rows: 42px 0fr;
    width: 44px;
    overflow: hidden;
    visibility: hidden;
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
  .floating-docs-navigation.ready {
    visibility: visible;
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
  .docs-navigation-trigger:focus-visible,
  .docs-navigation-close:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -4px;
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
    display: grid;
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
    max-height: max(0px, calc(100dvh - var(--navigation-top) - 56px));
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 4px 12px 12px;
  }
  @media (prefers-reduced-motion: reduce) {
    .floating-docs-navigation,
    .floating-docs-title,
    .floating-docs-content {
      transition: none;
    }
  }
</style>
