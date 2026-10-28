<script lang="ts">
  import ForumView from '$lib/views/ForumView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ForumView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  threads={data.threads}
  {language}
/>
