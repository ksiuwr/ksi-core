<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import {
    FileText,
    Globe,
    ChevronRight,
    FolderPlus,
    Pencil,
    ArrowRightLeft,
    FolderOpen
  } from '@lucide/svelte';
  import { docsPath } from 'shared/docs';
  import { docFolderPath } from 'shared/doc-folders';
  import DocFolderSelect from './DocFolderSelect.svelte';
  import DocTreeName from './DocTreeName.svelte';
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
  <div class="tree-page" style:--depth={depth}>
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
      <FileText size={14} aria-hidden="true" /><DocTreeName value={page.title} />
      {#if page.public}<Globe size={12} aria-label={'Public'} />{/if}
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
  {#each node.folders as folder (folder.id)}
    <details class="tree-folder" open>
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
        <ChevronRight size={14} class="tree-chevron" aria-hidden="true" /><DocTreeName
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
  {#each node.pages as page (page.id)}{@render pageRow(page, depth)}{/each}
{/snippet}

<div class="tree-heading">
  <span>{'Pages'}</span>
  {#if index.access.canReview}<button
      type="button"
      class="tree-tool"
      title={'New folder'}
      aria-label={'New folder'}
      onclick={() => folderForm(null, null)}><FolderPlus size={15} aria-hidden="true" /></button
    >{/if}
</div>
{#if index.access.canReview}
  <div
    class="tree-root"
    class:drop-target={over === null}
    role="group"
    aria-label={'Top level'}
    ondragover={(event) => dragOver(event, null)}
    ondragleave={() => (over = undefined)}
    ondrop={(event) => drop(event, null)}
  >
    <FolderOpen size={14} aria-hidden="true" />{'Top level'}
  </div>
{/if}
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
  .page-tree {
    min-width: 0;
  }
  .tree-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 16px 8px 6px 10px;
    color: var(--muted);
    font: 10px var(--mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .tree-folder summary,
  .tree-link,
  .tree-root {
    display: flex;
    gap: 7px;
    align-items: center;
    padding: 7px 8px 7px calc(8px + var(--depth, 0) * 14px);
    color: var(--muted);
    border-radius: var(--radius-md);
    font-size: 13px;
    line-height: 1.4;
  }
  .tree-folder summary {
    cursor: pointer;
    list-style: none;
  }
  .tree-folder summary::-webkit-details-marker {
    display: none;
  }
  .tree-folder[open] > summary :global(.tree-chevron) {
    transform: rotate(90deg);
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
    display: flex;
    align-items: center;
    position: relative;
  }
  .tree-link {
    flex: 1;
    min-width: 0;
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
    background: var(--surface-muted);
    color: var(--ink);
  }
  .tree-tools {
    display: inline-flex;
    flex-shrink: 0;
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
  }
  .tree-empty {
    padding: 4px 10px 4px calc(12px + var(--depth, 0) * 14px);
    color: var(--muted);
    font-size: 12px;
  }
  .tree-root {
    margin-bottom: 4px;
    border: 1px dashed var(--line);
  }
  .drop-target {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface)) !important;
    outline: 1px solid var(--accent);
    outline-offset: -1px;
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
