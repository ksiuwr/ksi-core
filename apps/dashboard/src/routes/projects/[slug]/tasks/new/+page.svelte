<script lang="ts">
  import NewTaskView from '$lib/views/NewTaskView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<NewTaskView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  board={data.board}
  items={data.items}
  {language}
/>
