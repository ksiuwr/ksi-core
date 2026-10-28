<script lang="ts">
  import NewArticleView from '$lib/views/NewArticleView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<NewArticleView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  {language}
/>
