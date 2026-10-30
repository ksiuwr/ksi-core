<script lang="ts">
  import '@ksi-core/ui/docs-prose.css';
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import PublicDocsSidebar from '$lib/components/PublicDocsSidebar.svelte';
  let { data, children }: { data: import('./$types').LayoutData; children: Snippet } = $props();
</script>

<div class="docs-shell page-container">
  <aside class="docs-sidebar">
    <PublicDocsSidebar
      pages={data.publicDocs}
      workspace={page.params.workspace}
      slug={page.params.slug}
    />
  </aside>
  <div class="docs-workspace">{@render children()}</div>
</div>

<style>
  .docs-shell {
    display: grid;
    grid-template-columns: 264px minmax(0, 1fr);
    gap: 48px;
    align-items: start;
    max-width: 1360px;
    padding-block: 32px 80px;
  }
  .docs-sidebar {
    position: sticky;
    top: 88px;
    min-width: 0;
    max-height: calc(100dvh - 112px);
    overflow: auto;
    scrollbar-width: thin;
  }
  .docs-workspace {
    min-width: 0;
  }
  @media (max-width: 900px) {
    .docs-shell {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
      padding-top: 20px;
    }
    .docs-sidebar {
      position: static;
      max-height: none;
      overflow: visible;
    }
  }
</style>
