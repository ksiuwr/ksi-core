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
  import {
    Button,
    Dialog,
    DialogHeader,
    HStack,
    Icon,
    IconButton,
    Text,
    VStack
  } from '@astryx-sv/core';

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
      {#if page.public}<Globe class="tree-public" size={12} aria-label={'Publiczna'} />{/if}
    </a>
    {#if index.access.canReview}
      <IconButton
        label={`Przenieś stronę: ${page.title}`}
        tooltip={'Przenieś stronę'}
        variant="ghost"
        size="sm"
        class="tree-tool"
        onclick={() => askMove(page, page.folderId)}
      >
        {#snippet icon()}<Icon icon={ArrowRightLeft} size="sm" />{/snippet}
      </IconButton>
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
          <HStack gap={0} class="tree-tools">
            <IconButton
              label={`Dodaj podfolder: ${folder.name}`}
              tooltip={'Dodaj podfolder'}
              variant="ghost"
              size="sm"
              onclick={(event) => {
                event.preventDefault();
                folderForm(null, folder.id);
              }}
            >
              {#snippet icon()}<Icon icon={FolderPlus} size="sm" />{/snippet}
            </IconButton>
            <IconButton
              label={`Edytuj folder: ${folder.name}`}
              tooltip={'Edytuj folder'}
              variant="ghost"
              size="sm"
              onclick={(event) => {
                event.preventDefault();
                folderForm(index.folders.find((item) => item.id === folder.id)!, null);
              }}
            >
              {#snippet icon()}<Icon icon={Pencil} size="sm" />{/snippet}
            </IconButton>
          </HStack>
        {/if}
      </summary>
      {@render branch(folder, depth + 1)}
      {#if !folder.folders.length && !folder.pages.length}<Text
          type="supporting"
          display="block"
          class="tree-empty"
          style={`--depth:${depth + 1}`}
        >
          Pusty folder
        </Text>{/if}
    </details>
  {/each}
{/snippet}

<HStack
  class={`tree-heading${liftable ? ' drop-zone' : ''}${over === null ? ' drop-target' : ''}`}
  role="group"
  aria-label={liftable ? 'Najwyższy poziom' : undefined}
  gap={1.5}
  vAlign="center"
  ondragover={(event) => dragOver(event, null)}
  ondragleave={() => (over = undefined)}
  ondrop={(event) => drop(event, null)}
>
  {#if liftable}
    <Icon icon={FolderOpen} size="sm" />
    <Text type="supporting" size="2xs">Przenieś na najwyższy poziom</Text>
  {:else}
    <Text type="supporting" size="2xs">Strony</Text>
    <HStack gap={0} class="tree-heading-tools">
      {#if index.access.canPropose}
        {@const newPage = index.access.canReview ? 'Nowa strona' : 'Zaproponuj stronę'}
        <IconButton
          href={docsPath(slug, 'new')}
          label={newPage}
          tooltip={newPage}
          variant="ghost"
          size="sm"
        >
          {#snippet icon()}<Icon icon={FilePlus} size="sm" />{/snippet}
        </IconButton>
      {/if}
      {#if index.access.canReview}
        <IconButton
          label={'Nowy folder'}
          tooltip={'Nowy folder'}
          variant="ghost"
          size="sm"
          onclick={() => folderForm(null, null)}
        >
          {#snippet icon()}<Icon icon={FolderPlus} size="sm" />{/snippet}
        </IconButton>
      {/if}
    </HStack>
  {/if}
</HStack>
<VStack class="page-tree" gap={0} role="group" aria-label={'Strony dokumentacji'}>
  {@render branch(tree, 0)}
  {#if !index.pages.length && !index.folders.length}<Text
      type="supporting"
      display="block"
      class="tree-empty"
    >
      Brak stron.
    </Text>{/if}
</VStack>
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
<Dialog
  isOpen={!!moving}
  onOpenChange={(next) => {
    if (!next && !busy) moving = null;
  }}
  purpose="form"
  width={460}
  padding={6}
>
  <VStack as="form" gap={3} onsubmit={move}>
    <DialogHeader title="Przenieś stronę" hasDivider={false} />
    <DocError code={error} />
    {#if moving}
      <Text as="p">
        {#if destinationName}
          {`Czy chcesz przenieść „${moving.title}” do folderu „${destinationName}”?`}
        {:else}
          {`Czy chcesz przenieść „${moving.title}” na najwyższy poziom?`}
        {/if}
      </Text>
      <DocFolderSelect
        id={`${uid}-destination`}
        bind:value={destination}
        folders={index.folders}
        label={'Folder docelowy'}
        locale={index.locale}
        disabled={busy}
      />
      <HStack hAlign="end" gap={2}>
        <Button
          variant="secondary"
          label="Anuluj"
          isDisabled={busy}
          onclick={() => (moving = null)}
        />
        <Button
          type="submit"
          label="Przenieś"
          isDisabled={busy || (destination || null) === moving.folderId}
        />
      </HStack>
    {/if}
  </VStack>
</Dialog>

<style>
  /* An auto column would grow to fit full page names; this keeps rows to the panel so
     names shorten instead of scrolling sideways. */
  :global(.page-tree) {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
    min-width: 0;
  }
  :global(.tree-heading) {
    min-height: 30px;
    margin: var(--spacing-2) 0 2px;
    padding-left: var(--spacing-1-5);
    border: 1px solid transparent;
    border-radius: var(--radius-element);
    color: var(--color-text-secondary);
    font: 10px var(--font-family-code);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  :global(.tree-heading-tools) {
    margin-left: auto;
    padding-right: 2px;
  }
  :global(.tree-heading.drop-zone) {
    border: 1px dashed var(--color-border-emphasized);
    color: var(--color-text-primary);
  }
  /* A child's icon sits under its parent's name: chevron plus gap. */
  .tree-folder summary,
  .tree-link {
    position: relative;
    display: flex;
    gap: var(--spacing-1-5);
    align-items: center;
    min-height: 30px;
    padding: 6px 8px 6px calc(6px + var(--depth, 0) * 20px);
    color: var(--color-text-secondary);
    border-radius: var(--radius-element);
    font-size: var(--font-size-base);
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
    transition: transform 120ms var(--ease-standard);
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
    background: var(--color-background-muted);
    color: var(--color-text-primary);
  }
  .tree-link.active :global(svg:first-child) {
    color: var(--color-icon-accent);
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
  .tree-page > :global(.tree-tool),
  :global(.tree-tools) {
    position: absolute;
    top: 1px;
    right: 1px;
  }
  :global(.tree-tools) {
    display: inline-flex;
    border-radius: var(--radius-inner);
  }
  @media (hover: hover) {
    .tree-page > :global(.tree-tool),
    :global(.tree-tools) {
      opacity: 0;
    }
    .tree-page:hover > :global(.tree-tool),
    .tree-page:focus-within > :global(.tree-tool),
    summary:hover :global(.tree-tools),
    summary:focus-within :global(.tree-tools) {
      opacity: 1;
    }
    /* Long names continue under the tools; the backdrop keeps both legible. */
    summary:hover :global(.tree-tools),
    summary:focus-within :global(.tree-tools) {
      background: var(--color-background-muted);
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
    .tree-page > :global(.tree-tool),
    :global(.tree-tools) {
      opacity: 0.6;
    }
  }
  :global(.tree-empty) {
    padding: 4px 8px 4px calc(6px + var(--depth, 0) * 20px);
  }
  .drop-target,
  :global(.tree-heading.drop-target) {
    background: color-mix(
      in srgb,
      var(--color-accent) 12%,
      var(--color-background-surface)
    ) !important;
    outline: 1px solid var(--color-accent);
    outline-offset: -1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .tree-folder summary :global(.tree-chevron) {
      transition: none;
    }
  }
</style>
