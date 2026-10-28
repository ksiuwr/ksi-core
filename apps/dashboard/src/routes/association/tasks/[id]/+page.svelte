<script lang="ts">
  import TaskView from '$lib/views/TaskView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<TaskView
  workspace="association"
  projectSlug=""
  item={data.item}
  board={data.board}
  members={data.members}
  comments={data.comments}
  activity={data.activity}
  activityNextPage={data.activityNextPage}
  activityError={data.activityError}
  {language}
  canManage={data.canManage}
  userId={data.userId}
  refresh={invalidateAll}
/>
