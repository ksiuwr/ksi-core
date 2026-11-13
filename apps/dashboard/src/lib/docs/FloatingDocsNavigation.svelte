<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { afterNavigate } from '$app/navigation';
  import { PanelLeftClose, PanelLeftOpen, X } from '@lucide/svelte';
  import { HStack, Icon, IconButton, Text, VStack } from '@astryx-sv/core';

  let {
    label,
    docked: savedDocked,
    children
  }: { label: string; docked: boolean; children: Snippet } = $props();
  const uid = $props.id();
  // Phones keep the bar above the content; a docked tree would push every page down.
  const narrow = new MediaQuery('(max-width: 760px)');
  let root = $state<HTMLElement>();
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
    if (restoreFocus) document.getElementById(`${uid}-trigger`)?.focus();
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
<VStack class={`docs-navigation-anchor${docked ? ' docked' : ''}`} gap={0}>
  <aside
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
    <HStack class="floating-docs-header" gap={0} vAlign="center">
      <IconButton
        id={`${uid}-trigger`}
        {label}
        tooltip={shown ? 'Ukryj panel boczny' : 'Pokaż panel boczny'}
        aria-controls={`${uid}-content`}
        aria-expanded={expanded}
        variant="ghost"
        size="lg"
        class="docs-navigation-trigger"
        onclick={toggle}
      >
        {#snippet icon()}
          <Icon icon={shown ? PanelLeftClose : PanelLeftOpen} size="md" />
        {/snippet}
      </IconButton>
      <Text class="floating-docs-title" type="supporting" maxLines={1} aria-hidden="true">
        {label}
      </Text>
      {#if open}
        <IconButton
          label={'Zamknij nawigację'}
          tooltip={'Zamknij nawigację'}
          variant="ghost"
          size="sm"
          class="docs-navigation-close"
          onclick={() => close(true)}
        >
          {#snippet icon()}<Icon icon={X} size="sm" />{/snippet}
        </IconButton>
      {/if}
    </HStack>
    <VStack
      id={`${uid}-content`}
      class="floating-docs-content"
      gap={0}
      inert={!expanded}
      aria-hidden={!expanded}
    >
      <VStack class="floating-docs-scroll" gap={0} isScrollable>{@render children()}</VStack>
    </VStack>
  </aside>
</VStack>

<style>
  :global(.docs-navigation-anchor) {
    --navigation-width: 320px;
    --docked-width: 264px;
    position: sticky;
    top: var(--spacing-4);
    /* Above the article, below the dashboard sidebar (35), which opens over the page. */
    z-index: 30;
    width: 44px;
    height: 44px;
    transition:
      width 240ms var(--ease-standard),
      margin 240ms var(--ease-standard);
  }
  .floating-docs-navigation {
    position: absolute;
    top: 0;
    left: 0;
    display: grid;
    grid-template-rows: 42px 0fr;
    width: 44px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 22px;
    background: var(--color-background-surface);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-low);
    transition:
      width 220ms var(--ease-standard),
      grid-template-rows 240ms var(--ease-standard),
      border-radius 220ms var(--ease-standard),
      border-color 180ms ease,
      background-color 180ms ease,
      box-shadow 180ms ease;
  }
  .floating-docs-navigation.open {
    width: var(--navigation-width);
    grid-template-rows: 42px 1fr;
    border-radius: var(--radius-container);
    box-shadow: var(--shadow-high);
  }
  :global(.floating-docs-header) {
    min-width: 0;
  }
  :global(.docs-navigation-trigger) {
    width: 42px;
    height: 42px;
    border-radius: 50%;
  }
  :global(.floating-docs-title) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    opacity: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: var(--font-size-base);
    font-weight: 500;
    transition: opacity 120ms ease;
  }
  :global(.floating-docs-navigation.open .floating-docs-title) {
    opacity: 1;
    transition-delay: 60ms;
  }
  :global(.docs-navigation-close) {
    display: none;
    margin-right: var(--spacing-1-5);
  }
  /* With a mouse the button itself closes the panel; a touch target needs an explicit one. */
  @media (hover: none) {
    :global(.docs-navigation-close) {
      display: grid;
    }
  }
  :global(.floating-docs-content) {
    min-height: 0;
    overflow: hidden;
    visibility: hidden;
    opacity: 0;
    transition: opacity 120ms ease;
  }
  :global(.floating-docs-navigation.open .floating-docs-content) {
    visibility: visible;
    opacity: 1;
    transition-delay: 60ms;
  }
  :global(.floating-docs-scroll) {
    width: calc(var(--navigation-width) - 2px);
    /* Fits below the top bar at the top of a page, which is the lowest this panel starts. */
    max-height: max(0px, calc(100dvh - 160px));
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 2px 8px 8px;
  }
  /* Docked, the panel becomes the plain column: it grows to the tree's height and drops
     its border, shadow and fill, while the button stays where the rail had it. */
  @media (min-width: 761px) {
    :global(.docs-navigation-anchor.docked) {
      width: var(--docked-width);
      height: auto;
      margin-right: var(--spacing-3);
    }
    :global(.docs-navigation-anchor.docked) .floating-docs-navigation {
      position: relative;
      width: var(--docked-width);
      grid-template-rows: 42px 1fr;
      border-color: transparent;
      border-radius: var(--radius-container);
      background-color: transparent;
      box-shadow: none;
    }
    :global(.docs-navigation-anchor.docked) :global(.floating-docs-title),
    :global(.docs-navigation-anchor.docked) :global(.floating-docs-content) {
      visibility: visible;
      opacity: 1;
      transition-delay: 60ms;
    }
    :global(.docs-navigation-anchor.docked) :global(.floating-docs-scroll) {
      width: calc(var(--docked-width) - 2px);
    }
  }
  /* Too narrow for a rail: the button becomes a full-width bar above the content. */
  @media (max-width: 760px) {
    :global(.docs-navigation-anchor) {
      --navigation-width: calc(100vw - 32px);
      position: relative;
      top: 0;
      width: auto;
      margin-bottom: var(--spacing-5);
    }
    .floating-docs-navigation,
    .floating-docs-navigation.open {
      width: 100%;
      border-radius: var(--radius-container);
    }
    :global(.floating-docs-title) {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.docs-navigation-anchor),
    .floating-docs-navigation,
    :global(.floating-docs-title),
    :global(.floating-docs-content) {
      transition: none;
    }
  }
</style>
