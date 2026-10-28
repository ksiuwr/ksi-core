<script lang="ts">
  import ThreadView from '$lib/views/ThreadView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<ThreadView
  workspace="association"
  projectSlug=""
  thread={data.thread}
  members={data.members}
  events={data.events}
  eventsNextPage={data.eventsNextPage}
  eventsError={data.eventsError}
  canManage={data.canManage}
  userId={data.userId}
  refresh={invalidateAll}
/>
