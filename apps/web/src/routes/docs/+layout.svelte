<script lang="ts">
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
    grid-template-columns: 228px minmax(0, 1fr);
    gap: 40px;
    align-items: start;
    max-width: 1360px;
    padding-block: 28px 80px;
  }
  .docs-sidebar {
    position: sticky;
    top: 84px;
    min-width: 0;
    max-height: calc(100dvh - 108px);
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
