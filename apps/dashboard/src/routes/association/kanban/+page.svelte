<script lang="ts">
  import KanbanView from '$lib/views/KanbanView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<KanbanView
  workspace="association"
  projectSlug=""
  projectId=""
  board={data.board}
  items={data.items}
  involvement={data.involvement}
  canManage={data.canManage}
  userId={data.user?.id ?? ''}
  refresh={invalidateAll}
/>
