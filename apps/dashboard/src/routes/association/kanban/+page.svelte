<script lang="ts">
  import KanbanView from '$lib/views/KanbanView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<KanbanView
  workspace="association"
  projectSlug=""
  projectId=""
  board={data.board}
  items={data.items}
  {language}
  canManage={data.canManage}
  userId={data.user?.id ?? ''}
  refresh={invalidateAll}
/>
