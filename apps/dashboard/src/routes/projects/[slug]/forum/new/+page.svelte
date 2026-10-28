<script lang="ts">
  import NewThreadView from '$lib/views/NewThreadView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<NewThreadView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  {language}
/>
