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
    if (id === 'todo') return 'Do zrobienia';
    if (id === 'progress') return 'W trakcie';
    if (id === 'done') return 'Gotowe';
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
  <h1>Usunięte zadania</h1>
  <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'board')}
    ><ArrowLeft size={15} aria-hidden="true" />Wróć do tablicy</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
<div class="graveyard-notice">
  <Archive size={18} aria-hidden="true" />
  <p>Usunięte zadania są przechowywane tutaj. Liderzy mogą przywrócić je do poprzedniej kolumny.</p>
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
        ><RotateCcw size={15} aria-hidden="true" />Przywróć</button
      >
    </article>
  {/each}
  {#if !items.length}
    <div class="empty-state">
      <Trash2 size={28} strokeWidth={1.4} aria-hidden="true" />
      <h2>Brak usuniętych zadań</h2>
      <p>Usunięte z tablicy zadania pojawią się tutaj.</p>
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
