<script lang="ts">
  import ArticlesView from '$lib/views/ArticlesView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ArticlesView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  articles={data.articles}
  {language}
  canCreate={data.canCreate}
/>
