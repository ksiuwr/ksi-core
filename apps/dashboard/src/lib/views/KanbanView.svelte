<script lang="ts">
  import KanbanBoard from '$lib/KanbanBoard.svelte';
  import { dashboardPath, newTaskPath, taskPath, type Workspace } from '$lib/navigation';
  import type { BoardData, BoardLabel, BoardStatus, Item } from '$lib/types';
  import type { TaskInvolvement } from '$lib/task-filters';
  import { Banner, Button, Heading, HStack, VStack } from '@astryx-sv/core';
  import { Trash2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    board,
    items,
    involvement = null,
    canManage,
    userId,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    board: BoardData | null;
    items: Item[];
    involvement?: TaskInvolvement | null;
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

<VStack gap={4}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <Heading level={1}>Tablica zadań</Heading>
    <Button
      href={`${dashboardPath(workspace, projectSlug, 'board')}/graveyard`}
      variant="secondary"
      label="Usunięte zadania"
    >
      {#snippet icon()}<Trash2 size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>
  {#if error}<Banner status="error" title={error} role="alert" />{/if}
  <KanbanBoard
    {items}
    {involvement}
    {statuses}
    boardLabels={labels}
    boardId={board?.id ?? ''}
    {projectId}
    {canManage}
    {userId}
    taskHref={(item) => taskPath(workspace, projectSlug, item.referenceNumber ?? item.id)}
    newTaskHref={(status) => newTaskPath(workspace, projectSlug, status)}
    {refresh}
    reportError={(message) => (error = message)}
  />
</VStack>
