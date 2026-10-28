<script lang="ts">
  import TaskView from '$lib/views/TaskView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
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
  canManage={data.canManage}
  userId={data.userId}
  refresh={invalidateAll}
/>
