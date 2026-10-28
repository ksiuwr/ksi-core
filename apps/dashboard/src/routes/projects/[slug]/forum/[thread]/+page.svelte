<script lang="ts">
  import ThreadView from '$lib/views/ThreadView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ThreadView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  thread={data.thread}
  members={data.members}
  events={data.events}
  eventsNextPage={data.eventsNextPage}
  eventsError={data.eventsError}
  {language}
  canManage={data.canManage}
  userId={data.userId}
  refresh={invalidateAll}
/>
