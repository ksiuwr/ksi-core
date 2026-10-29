<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { formatDate } from 'shared/format';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, taskPath, type Workspace } from '$lib/navigation';
  import type { BoardStatus, Item } from '$lib/types';
  import { ArrowLeft, Archive, RotateCcw, Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    items,
    statuses,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    items: Item[];
    statuses: BoardStatus[];
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let busy = $state(false);
  let error = $state('');

  const columnLabel = (id: string) => {
    if (id === 'todo') return 'To do';
    if (id === 'progress') return 'In progress';
    if (id === 'done') return 'Done';
    return statuses.find((status) => status.id === id)?.name ?? id;
  };

  async function restore(item: Item) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      await api(`/platform/items/${item.id}/restore`, 'POST', { version: item.version });
      await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <h1>Removed tasks</h1>
  <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'board')}
    ><ArrowLeft size={15} aria-hidden="true" />{'Back to board'}</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
<div class="graveyard-notice">
  <Archive size={18} aria-hidden="true" />
  <p>Removed tasks are kept here. Leaders can restore them to their previous column.</p>
</div>
<div class="graveyard-list">
  {#each items as item (item.id)}
    <article class="removed-task">
      <div class="removed-task-info">
        <h2>
          <a href={taskPath(workspace, projectSlug, item.referenceNumber ?? item.id)}
            >{item.title}</a
          >
        </h2>
        <p>{item.markdown.slice(0, 180)}</p>
        <span class="tag">{columnLabel(item.column)}</span>
        {#if item.deletedAt}<time datetime={item.deletedAt}
            >{formatDate(item.deletedAt, language)}</time
          >{/if}
      </div>
      <button class="btn btn-outline" disabled={busy} onclick={() => restore(item)}
        ><RotateCcw size={15} aria-hidden="true" />{'Restore'}</button
      >
    </article>
  {/each}
  {#if !items.length}
    <div class="empty-state">
      <Trash2 size={28} strokeWidth={1.4} aria-hidden="true" />
      <h2>No removed tasks</h2>
      <p>Tasks removed from the board will appear here.</p>
    </div>
  {/if}
</div>

<style>
  .removed-task h2 a {
    color: inherit;
    text-decoration: none;
  }
  .removed-task h2 a:hover {
    text-decoration: underline;
  }
</style>
