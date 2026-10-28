<script lang="ts">
  import KanbanBoard from '$lib/KanbanBoard.svelte';
  import { dashboardPath, newTaskPath, taskPath, type Workspace } from '$lib/navigation';
  import type { BoardData, BoardLabel, BoardStatus, Item } from '$lib/types';
  import { Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    board,
    items,
    language,
    canManage,
    userId,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    board: BoardData | null;
    items: Item[];
    language: 'pl' | 'en';
    canManage: boolean;
    userId: string;
    refresh: () => Promise<void>;
  } = $props();

  let error = $state('');

  const statuses = $derived<BoardStatus[]>(board?.statuses ?? []);
  const labels = $derived<BoardLabel[]>(
    (board?.labels ?? []).map((label) =>
      typeof label === 'string'
        ? { name: label, color: '#6b7280' }
        : { name: label.name, color: label.color || '#6b7280', description: label.description }
    )
  );
</script>

<div class="workspace-header">
  <h1>{'Task board'}</h1>
  <a class="btn btn-outline" href={`${dashboardPath(workspace, projectSlug, 'board')}/graveyard`}
    ><Trash2 size={15} aria-hidden="true" />{'Removed tasks'}</a
  >
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
<KanbanBoard
  {items}
  {statuses}
  boardLabels={labels}
  boardId={board?.id ?? ''}
  {projectId}
  {language}
  {canManage}
  {userId}
  taskHref={(id) => taskPath(workspace, projectSlug, id)}
  newTaskHref={(status) => newTaskPath(workspace, projectSlug, status)}
  {refresh}
  reportError={(message) => (error = message)}
/>

<style>
  .workspace-header h1 {
    display: flex;
    align-items: center;
    gap: 12px;
  }
</style>
