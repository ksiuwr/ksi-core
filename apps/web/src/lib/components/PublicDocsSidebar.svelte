<script lang="ts">
  import { BookOpen, ChevronDown, ChevronRight, FileText } from '@lucide/svelte';
  import TreeLabel from '@ksi-core/ui/platform/TreeLabel.svelte';
  import { associationDocsKey } from 'shared/docs';
  import {
    publicDocPath,
    publicDocWorkspaces,
    type PublicDocFolder,
    type PublicDocSummary
  } from 'shared/public-docs';
  import { locale } from '$lib/locale.svelte';

  let { pages, workspace, slug }: { pages: PublicDocSummary[]; workspace?: string; slug?: string } =
    $props();
  const workspaces = $derived(publicDocWorkspaces(pages, locale.current));
  const current = $derived(
    pages.find((doc) => (doc.projectSlug ?? associationDocsKey) === workspace && doc.slug === slug)
  );
  let mobilePicker = $state<HTMLDetailsElement>();
  function closePicker() {
    if (mobilePicker) mobilePicker.open = false;
  }
</script>

{#snippet files(
  node: Pick<PublicDocFolder, 'folders' | 'pages'>,
  owner: string,
  depth: number,
  path: string
)}
  {#each node.pages as doc (doc.slug)}
    <a
      class="doc-nav-page"
      href={publicDocPath(owner, doc.slug)}
      class:active={workspace === owner && slug === doc.slug}
      aria-current={workspace === owner && slug === doc.slug ? 'page' : undefined}
      title={doc.title}
      style:--depth={depth}
      onclick={closePicker}
    >
      <FileText size={14} aria-hidden="true" /><TreeLabel value={doc.title} />
    </a>
  {/each}
  {#each node.folders as folder (folder.id)}
    {@const folderPath = path ? `${path} / ${folder.name}` : folder.name}
    <details class="doc-nav-folder" open>
      <summary style:--depth={depth} title={folderPath}>
        <ChevronRight size={14} class="doc-nav-chevron" aria-hidden="true" />
        <TreeLabel value={folder.name} tooltip={folderPath} />
      </summary>
      {@render files(folder, owner, depth + 1, folderPath)}
    </details>
  {/each}
{/snippet}

{#snippet navigation()}
  <nav aria-label={'Documentation pages'}>
    <a
      href="/docs"
      class="doc-nav-home"
      class:active={!workspace}
      aria-current={!workspace ? 'page' : undefined}
      onclick={closePicker}
    >
      <BookOpen size={15} aria-hidden="true" />{'All documentation'}
    </a>
    <p class="doc-nav-label">{'Workspaces'}</p>
    {#each workspaces as owner (owner.slug)}
      <details class="doc-nav-workspace" open={!workspace || workspace === owner.slug}>
        <summary title={owner.name}>
          <ChevronRight size={14} class="doc-nav-chevron" aria-hidden="true" />
          <TreeLabel value={owner.name} />
        </summary>
        <div class="doc-nav-files">{@render files(owner, owner.slug, 1, '')}</div>
      </details>
    {/each}
    {#if !workspaces.length}<p class="doc-nav-empty">{'No public documentation yet.'}</p>{/if}
  </nav>
{/snippet}

<div class="desktop-navigation">{@render navigation()}</div>
<details class="mobile-navigation" bind:this={mobilePicker}>
  <summary
    ><BookOpen size={16} aria-hidden="true" /><span>{current?.title ?? 'Documentation pages'}</span
    ><ChevronDown size={16} aria-hidden="true" /></summary
  >
  {@render navigation()}
</details>

<style>
  nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
  }
  /* A child's icon sits under its parent's name: chevron plus gap. */
  .doc-nav-home,
  .doc-nav-page,
  .doc-nav-workspace > summary,
  .doc-nav-folder > summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    min-height: 30px;
    padding: 6px 8px 6px calc(8px + var(--depth, 0) * 20px);
    border-radius: var(--radius-md);
    color: var(--muted);
    font-size: 13px;
    line-height: 1.4;
    text-decoration: none;
  }
  .doc-nav-home {
    gap: 8px;
  }
  .doc-nav-workspace > summary {
    color: var(--ink);
    font-weight: 500;
  }
  .doc-nav-folder > summary {
    font-weight: 500;
  }
  summary {
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  nav :global(svg) {
    flex-shrink: 0;
  }
  nav :global(.doc-nav-chevron) {
    transition: transform 120ms var(--ease-out);
  }
  .doc-nav-workspace[open] > summary :global(.doc-nav-chevron),
  .doc-nav-folder[open] > summary :global(.doc-nav-chevron) {
    transform: rotate(90deg);
  }
  .doc-nav-folder[open],
  .doc-nav-files {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
  }
  .doc-nav-files {
    margin-bottom: 6px;
  }
  .doc-nav-home:hover,
  .doc-nav-page:hover,
  .doc-nav-folder > summary:hover,
  .doc-nav-workspace > summary:hover {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .active {
    color: var(--ink);
    background: var(--surface-muted);
    font-weight: 500;
  }
  .doc-nav-page.active :global(svg) {
    color: var(--accent);
  }
  .doc-nav-label {
    margin: 20px 8px 6px;
    color: var(--muted);
    font: 10px var(--mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .doc-nav-empty {
    padding: 8px;
    color: var(--muted);
    font-size: 13px;
  }
  .mobile-navigation {
    display: none;
  }
  @media (max-width: 900px) {
    .desktop-navigation {
      display: none;
    }
    .mobile-navigation {
      display: block;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: var(--surface);
    }
    .mobile-navigation > summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      color: var(--ink);
      font-size: 13px;
    }
    .mobile-navigation > summary span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mobile-navigation > summary :global(svg) {
      flex-shrink: 0;
    }
    .mobile-navigation > summary :global(svg:last-child) {
      margin-left: auto;
    }
    .mobile-navigation[open] > summary :global(svg:last-child) {
      transform: rotate(180deg);
    }
    .mobile-navigation nav {
      padding: 0 8px 8px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    nav :global(.doc-nav-chevron) {
      transition: none;
    }
  }
</style>
