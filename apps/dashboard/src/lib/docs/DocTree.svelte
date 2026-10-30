<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import {
    FileText,
    FilePlus,
    Globe,
    ChevronRight,
    FolderPlus,
    Pencil,
    ArrowRightLeft,
    FolderOpen
  } from '@lucide/svelte';
  import TreeLabel from '@ksi-core/ui/platform/TreeLabel.svelte';
  import { docsPath } from 'shared/docs';
  import { docFolderPath } from 'shared/doc-folders';
  import DocFolderSelect from './DocFolderSelect.svelte';
  import DocFolderDialog from './DocFolderDialog.svelte';
  import DocError from './DocError.svelte';
  import {
    docsRequest,
    errorCode,
    folderTree,
    type DocIndex,
    type DocSummary,
    type FolderNode,
    type DocFolder
  } from './docs';

  let {
    index,
    projectId,
    slug,
    selected
  }: { index: DocIndex; projectId: string; slug: string | null; selected?: string } = $props();
  const uid = $props.id();
  const tree = $derived(folderTree(index.pages, index.folders, index.locale));
  let folderOpen = $state(false);
  let editedFolder = $state<DocFolder | null>(null);
  let parentId = $state<string | null>(null);
  let dragging = $state<string | null>(null);
  let over = $state<string | null | undefined>(undefined);
  let moving = $state<DocSummary | null>(null);
  let destination = $state('');
  let moveDialog = $state<HTMLDialogElement>();
  let busy = $state(false);
  let error = $state('');
  const destinationName = $derived(docFolderPath(index.folders, destination || null, index.locale));
  // The top level is only a place to drop onto, so it appears for pages that can go there.
  const liftable = $derived(!!index.pages.find((page) => page.id === dragging)?.folderId);

  function href(page: DocSummary) {
    return docsPath(slug, page.slug);
  }
  function folderForm(folder: DocFolder | null, parent: string | null) {
    editedFolder = folder;
    parentId = parent;
    folderOpen = true;
  }
  function askMove(page: DocSummary, folderId: string | null) {
    moving = page;
    destination = folderId ?? '';
    error = '';
    moveDialog?.showModal();
  }
  function dragStart(event: DragEvent, page: DocSummary) {
    if (!index.access.canReview || !event.dataTransfer) return;
    dragging = page.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-ksi-doc-page', page.id);
  }
  function dragOver(event: DragEvent, folderId: string | null) {
    if (!dragging || !index.access.canReview) return;
    const page = index.pages.find((page) => page.id === dragging);
    if (!page || page.folderId === folderId) return;
    event.preventDefault();
    event.stopPropagation();
    over = folderId;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }
  function drop(event: DragEvent, folderId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer?.getData('application/x-ksi-doc-page');
    const page = index.pages.find((page) => page.id === id && page.id === dragging);
    dragging = null;
    over = undefined;
    if (index.access.canReview && page && page.folderId !== folderId) askMove(page, folderId);
  }
  async function move(event: SubmitEvent) {
    event.preventDefault();
    if (!moving || busy) return;
    busy = true;
    error = '';
    try {
      await docsRequest(`/docs/${moving.id}/move`, 'POST', {
        folderId: destination || null,
        version: moving.version
      });
      moveDialog?.close();
      moving = null;
      await invalidateAll();
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }
</script>

{#snippet pageRow(page: DocSummary, depth: number)}
  <div class="tree-page" class:editable={index.access.canReview} style:--depth={depth}>
    <a
      class="tree-link"
      class:active={selected === page.slug}
      aria-current={selected === page.slug ? 'page' : undefined}
      href={href(page)}
      title={page.title}
      draggable={index.access.canReview}
      ondragstart={(event) => dragStart(event, page)}
      ondragend={() => {
        dragging = null;
        over = undefined;
      }}
    >
      <FileText size={14} aria-hidden="true" /><TreeLabel value={page.title} />
      {#if page.public}<Globe class="tree-public" size={12} aria-label={'Public'} />{/if}
    </a>
    {#if index.access.canReview}
      <button
        type="button"
        class="tree-tool"
        title={'Move page'}
        aria-label={`${'Move page'}: ${page.title}`}
        onclick={() => askMove(page, page.folderId)}
        ><ArrowRightLeft size={13} aria-hidden="true" /></button
      >
    {/if}
  </div>
{/snippet}

{#snippet branch(node: FolderNode, depth: number)}
  {#each node.pages as page (page.id)}{@render pageRow(page, depth)}{/each}
  {#each node.folders as folder (folder.id)}
    <details class="tree-folder" class:editable={index.access.canReview} open>
      <summary
        class:drop-target={dragging && over === folder.id}
        title={folder.path.split('/').join(' / ')}
        style:--depth={depth}
        ondragover={(event) => dragOver(event, folder.id)}
        ondragleave={() => {
          if (over === folder.id) over = undefined;
        }}
        ondrop={(event) => drop(event, folder.id)}
      >
        <ChevronRight size={14} class="tree-chevron" aria-hidden="true" /><TreeLabel
          value={folder.name}
          tooltip={folder.path.split('/').join(' / ')}
        />
        {#if index.access.canReview}
          <span class="tree-tools">
            <button
              type="button"
              class="tree-tool"
              title={'Add subfolder'}
              aria-label={`${'Add subfolder'}: ${folder.name}`}
              onclick={(event) => {
                event.preventDefault();
                folderForm(null, folder.id);
              }}><FolderPlus size={13} aria-hidden="true" /></button
            >
            <button
              type="button"
              class="tree-tool"
              title={'Edit folder'}
              aria-label={`${'Edit folder'}: ${folder.name}`}
              onclick={(event) => {
                event.preventDefault();
                folderForm(index.folders.find((item) => item.id === folder.id)!, null);
              }}><Pencil size={13} aria-hidden="true" /></button
            >
          </span>
        {/if}
      </summary>
      {@render branch(folder, depth + 1)}
      {#if !folder.folders.length && !folder.pages.length}<p
          class="tree-empty"
          style:--depth={depth + 1}
        >
          {'Empty folder'}
        </p>{/if}
    </details>
  {/each}
{/snippet}

<div
  class="tree-heading"
  class:drop-zone={liftable}
  class:drop-target={over === null}
  role="group"
  aria-label={liftable ? 'Top level' : undefined}
  ondragover={(event) => dragOver(event, null)}
  ondragleave={() => (over = undefined)}
  ondrop={(event) => drop(event, null)}
>
  {#if liftable}
    <FolderOpen size={14} aria-hidden="true" /><span>{'Move to top level'}</span>
  {:else}
    <span>{'Pages'}</span>
    <span class="tree-heading-tools">
      {#if index.access.canPropose}
        {@const newPage = index.access.canReview ? 'New page' : 'Suggest a page'}
        <a class="tree-tool" href={docsPath(slug, 'new')} title={newPage} aria-label={newPage}
          ><FilePlus size={15} aria-hidden="true" /></a
        >
      {/if}
      {#if index.access.canReview}
        <button
          type="button"
          class="tree-tool"
          title={'New folder'}
          aria-label={'New folder'}
          onclick={() => folderForm(null, null)}><FolderPlus size={15} aria-hidden="true" /></button
        >
      {/if}
    </span>
  {/if}
</div>
<div class="page-tree" role="group" aria-label={'Documentation pages'}>
  {@render branch(tree, 0)}
  {#if !index.pages.length && !index.folders.length}<p class="tree-empty">{'No pages yet.'}</p>{/if}
</div>
<DocFolderDialog
  open={folderOpen}
  {projectId}
  folders={index.folders}
  pages={index.pages}
  folder={editedFolder}
  {parentId}
  onclose={() => (folderOpen = false)}
  ondeleted={async () => {
    await invalidateAll();
    folderOpen = false;
    editedFolder = null;
  }}
  onsaved={async () => {
    await invalidateAll();
    folderOpen = false;
  }}
/>
<dialog
  bind:this={moveDialog}
  class="move-dialog"
  aria-labelledby={`${uid}-move-title`}
  oncancel={(event) => {
    if (busy) event.preventDefault();
  }}
>
  <form onsubmit={move}>
    <h2 id={`${uid}-move-title`}>{'Move page'}</h2>
    <DocError code={error} />
    {#if moving}
      <p>
        {#if destinationName}
          {`Do you want to move “${moving.title}” into folder “${destinationName}”?`}
        {:else}
          {`Do you want to move “${moving.title}” to the top level?`}
        {/if}
      </p>
      <label for={`${uid}-destination`}>{'Destination folder'}</label>
      <DocFolderSelect
        id={`${uid}-destination`}
        bind:value={destination}
        folders={index.folders}
        label={'Destination folder'}
        locale={index.locale}
        disabled={busy}
      />
      <div class="move-actions">
        <button
          type="button"
          class="btn btn-outline"
          disabled={busy}
          onclick={() => moveDialog?.close()}>{'Cancel'}</button
        >
        <button class="btn" disabled={busy || (destination || null) === moving.folderId}
          >{'Move'}</button
        >
      </div>
    {/if}
  </form>
</dialog>

<style>
  /* An auto column would grow to fit full page names; this keeps rows to the panel so
     names shorten instead of scrolling sideways. */
  .page-tree {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    min-width: 0;
  }
  .tree-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 30px;
    margin: 10px 0 2px;
    padding-left: 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--muted);
    font: 10px var(--mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .tree-heading-tools {
    display: inline-flex;
    margin-left: auto;
    padding-right: 2px;
  }
  .tree-heading.drop-zone {
    border: 1px dashed var(--control-border-hover);
    color: var(--ink);
  }
  /* A child's icon sits under its parent's name: chevron plus gap. */
  .tree-folder summary,
  .tree-link {
    position: relative;
    display: flex;
    gap: 6px;
    align-items: center;
    min-height: 30px;
    padding: 6px 8px 6px calc(6px + var(--depth, 0) * 20px);
    color: var(--muted);
    border-radius: var(--radius-md);
    font-size: 13px;
    line-height: 1.4;
  }
  .tree-folder summary {
    cursor: pointer;
    font-weight: 500;
    list-style: none;
  }
  .tree-folder summary::-webkit-details-marker {
    display: none;
  }
  .tree-folder summary :global(.tree-chevron) {
    transition: transform 120ms var(--ease-out);
  }
  .tree-folder[open] > summary :global(.tree-chevron) {
    transform: rotate(90deg);
  }
  .tree-folder[open] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
  }
  .tree-folder :global(svg),
  .tree-link :global(svg) {
    flex-shrink: 0;
  }
  .tree-folder summary:hover,
  .tree-link:hover,
  .tree-link.active {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .tree-link.active :global(svg:first-child) {
    color: var(--accent);
  }
  .tree-page {
    position: relative;
  }
  .tree-link {
    text-decoration: none;
  }
  .tree-link[draggable='true'] {
    cursor: grab;
  }
  .tree-link[draggable='true']:active {
    cursor: grabbing;
  }
  .tree-tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    flex-shrink: 0;
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--muted);
    background: transparent;
    cursor: pointer;
  }
  .tree-tool:hover {
    background: color-mix(in srgb, var(--ink) 9%, transparent);
    color: var(--ink);
  }
  .tree-page > .tree-tool,
  .tree-tools {
    position: absolute;
    top: 3px;
    right: 3px;
  }
  .tree-tools {
    display: inline-flex;
    border-radius: var(--radius-sm);
  }
  @media (hover: hover) {
    .tree-page > .tree-tool,
    .tree-tools {
      opacity: 0;
    }
    .tree-page:hover > .tree-tool,
    .tree-page:focus-within > .tree-tool,
    summary:hover .tree-tools,
    summary:focus-within .tree-tools {
      opacity: 1;
    }
    /* Long names continue under the tools; the backdrop keeps both legible. */
    summary:hover .tree-tools,
    summary:focus-within .tree-tools {
      background: var(--surface-muted);
    }
    .tree-page.editable:hover :global(.tree-public),
    .tree-page.editable:focus-within :global(.tree-public) {
      opacity: 0;
    }
  }
  /* Touch screens have no hover, so tools stay visible, quietly, in space of their own. */
  @media (hover: none) {
    .tree-page.editable .tree-link {
      padding-right: 32px;
    }
    .tree-folder.editable summary {
      padding-right: 56px;
    }
    .tree-page > .tree-tool,
    .tree-tools {
      opacity: 0.6;
    }
  }
  .tree-empty {
    padding: 4px 8px 4px calc(6px + var(--depth, 0) * 20px);
    color: var(--muted);
    font-size: 12px;
  }
  .drop-target {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface)) !important;
    outline: 1px solid var(--accent);
    outline-offset: -1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .tree-folder summary :global(.tree-chevron) {
      transition: none;
    }
  }
  .move-dialog {
    width: min(460px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-lg);
  }
  .move-dialog::backdrop {
    background: rgb(12 13 15 / 0.42);
    backdrop-filter: blur(2px);
  }
  .move-dialog form {
    display: grid;
    gap: 14px;
  }
  .move-dialog h2 {
    margin: 0;
    font-size: 20px;
  }
  .move-dialog p {
    overflow-wrap: anywhere;
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
  }
  .move-dialog label {
    margin-bottom: -8px;
  }
  .move-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }
</style>
