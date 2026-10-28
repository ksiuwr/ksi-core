<script lang="ts">
  import KanbanView from '$lib/views/KanbanView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<KanbanView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  board={data.board}
  items={data.items}
  canManage={data.canManage}
  userId={data.user?.id ?? ''}
  refresh={invalidateAll}
/>
