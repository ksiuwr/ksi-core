<script lang="ts">
  import '@ksi-core/ui/docs-prose.css';
  import { untrack, type Snippet } from 'svelte';
  import { PanelLeftClose, PanelLeftOpen } from '@lucide/svelte';
  import { page } from '$app/state';
  import PublicDocsSidebar from '$lib/components/PublicDocsSidebar.svelte';
  let { data, children }: { data: import('./$types').LayoutData; children: Snippet } = $props();
  let sidebarCollapsed = $state(untrack(() => data.sidebarCollapsed));
  // Collapsing leaves the pointer or focus on the toggle, which would reopen the hover
  // panel at once; it stays shut until the pointer or focus leaves the sidebar.
  let peekSuppressed = $state(false);
  // The panel morphs between the toggle and the tree, so it needs the tree's height
  // as a length; `auto` cannot be animated.
  let treeHeight = $state(0);

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    peekSuppressed = sidebarCollapsed;
    document.cookie = `ksi-docs-sidebar=${sidebarCollapsed ? '1' : '0'}; Path=/docs; Max-Age=31536000; SameSite=Lax`;
  }
</script>

<div class="docs-shell page-container" class:sidebar-collapsed={sidebarCollapsed}>
  <aside
    class="docs-sidebar"
    class:peek-suppressed={peekSuppressed}
    onpointerleave={() => (peekSuppressed = false)}
    onfocusout={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) peekSuppressed = false;
    }}
  >
    <div class="sidebar-panel" style:--tree-height={treeHeight ? `${treeHeight}px` : undefined}>
      <button
        type="button"
        class="sidebar-toggle"
        aria-controls="docs-navigation"
        aria-expanded={!sidebarCollapsed}
        aria-label="Przełącz panel boczny"
        title="Przełącz panel boczny"
        onclick={toggleSidebar}
      >
        {#if sidebarCollapsed}<PanelLeftOpen size={18} aria-hidden="true" />{:else}<PanelLeftClose
            size={18}
            aria-hidden="true"
          />{/if}
      </button>
      <div id="docs-navigation" class="sidebar-content">
        <div bind:clientHeight={treeHeight}>
          <PublicDocsSidebar
            pages={data.publicDocs}
            workspace={page.params.workspace}
            slug={page.params.slug}
          />
        </div>
      </div>
    </div>
  </aside>
  <div class="docs-workspace">{@render children()}</div>
</div>

<style>
  .docs-shell {
    --sidebar-width: 264px;
    --sidebar-toggle: 40px;
    --sidebar-inset: 6px;
    --sidebar-gap: 6px;
    --sidebar-rail: calc(var(--sidebar-toggle) + 2 * var(--sidebar-inset));
    --sidebar-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    gap: 48px;
    align-items: start;
    max-width: 1360px;
    padding-block: 32px 80px;
    transition: grid-template-columns 240ms var(--sidebar-ease);
  }
  .docs-sidebar,
  .docs-workspace {
    min-width: 0;
  }
  /* Borderless: when collapsed, the ring around it is the panel's own edge. */
  .sidebar-toggle {
    display: grid;
    place-items: center;
    width: var(--sidebar-toggle);
    height: var(--sidebar-toggle);
    flex-shrink: 0;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }
  .sidebar-toggle:hover {
    background: color-mix(in srgb, var(--surface-muted) 70%, transparent);
    color: var(--ink);
  }
  .sidebar-toggle:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--ring-strong);
  }
  @media (min-width: 901px) {
    .docs-sidebar {
      --close-delay: 120ms;
      position: sticky;
      top: 88px;
      z-index: 10;
    }
    .docs-sidebar.peek-suppressed {
      --close-delay: 0s;
    }
    /* The panel is one box in every state: docked, it is the plain sidebar; collapsed, it
       shrinks to a frosted circle around the toggle, so the toggle's ring is the panel's
       edge and grows into the panel's border on hover. Inset plus padding stays constant,
       so the toggle never moves while the box morphs around it. */
    .sidebar-panel {
      --panel-height: min(
        calc(
          var(--tree-height) + var(--sidebar-toggle) + var(--sidebar-gap) + 2 * var(--sidebar-inset)
        ),
        calc(100dvh - 112px)
      );
      position: relative;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sidebar-gap);
      width: var(--sidebar-width);
      height: var(--panel-height, auto);
      max-height: calc(100dvh - 112px);
      padding: var(--sidebar-inset);
      overflow: hidden;
      /* Concentric with the toggle, so the corner wraps it. */
      border-radius: calc(var(--sidebar-toggle) / 2 + var(--sidebar-inset));
      box-shadow:
        inset 0 0 0 1px transparent,
        0 18px 40px -16px transparent;
      transition:
        top 240ms var(--sidebar-ease),
        left 240ms var(--sidebar-ease),
        width 240ms var(--sidebar-ease),
        height 240ms var(--sidebar-ease),
        padding 240ms var(--sidebar-ease),
        border-radius 240ms var(--sidebar-ease),
        background-color 160ms ease,
        box-shadow 160ms ease,
        backdrop-filter 160ms ease;
    }
    /* Never shrinks with the morphing panel, which only clips it, so no scrollbar flashes
       mid-transition; it scrolls once the tree outgrows the viewport. */
    .sidebar-content {
      flex: none;
      width: calc(var(--sidebar-width) - 2 * var(--sidebar-inset));
      max-height: calc(
        100dvh - 112px - var(--sidebar-toggle) - var(--sidebar-gap) - 2 * var(--sidebar-inset)
      );
      overflow-y: auto;
      scrollbar-width: thin;
      transition:
        opacity 160ms ease 60ms,
        visibility 0s;
    }

    .docs-shell.sidebar-collapsed {
      grid-template-columns: var(--sidebar-rail) minmax(0, 1fr);
    }
    .sidebar-collapsed .sidebar-panel {
      position: absolute;
      top: var(--sidebar-inset);
      left: var(--sidebar-inset);
      width: var(--sidebar-toggle);
      height: var(--sidebar-toggle);
      padding: 0;
      border-radius: calc(var(--sidebar-toggle) / 2);
      background: color-mix(in srgb, var(--surface) 70%, transparent);
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent),
        0 2px 8px -2px rgb(0 0 0 / 0.18);
      backdrop-filter: blur(16px) saturate(1.4);
      transition-delay: var(--close-delay);
    }
    .sidebar-collapsed .sidebar-content {
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 120ms ease var(--close-delay),
        visibility 0s linear calc(var(--close-delay) + 240ms);
    }
  }
  /* Hovering the toggle grows its ring into the floating panel without changing the
     saved preference or reflowing the article; keyboard focus opens it too. */
  @media (min-width: 901px) and (hover: hover) {
    .sidebar-collapsed
      .docs-sidebar:not(.peek-suppressed)
      .sidebar-panel:is(:hover, :has(:global(:focus-visible))) {
      top: 0;
      left: 0;
      width: var(--sidebar-width);
      height: var(--panel-height, auto);
      padding: var(--sidebar-inset);
      border-radius: calc(var(--sidebar-toggle) / 2 + var(--sidebar-inset));
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--line) 80%, transparent),
        0 18px 40px -16px rgb(0 0 0 / 0.28);
      transition-delay: 0s;
    }
    .sidebar-collapsed
      .docs-sidebar:not(.peek-suppressed)
      .sidebar-panel:is(:hover, :has(:global(:focus-visible)))
      .sidebar-content {
      opacity: 1;
      visibility: visible;
      transition-duration: 160ms, 0s;
      transition-delay: 60ms, 0s;
    }
  }
  @media (max-width: 900px) {
    .docs-shell {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
      padding-top: 20px;
    }
    .sidebar-toggle {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .docs-shell,
    .docs-shell .sidebar-panel,
    .docs-shell .sidebar-content {
      transition: none;
    }
  }
</style>
