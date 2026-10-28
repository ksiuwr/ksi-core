<script lang="ts">
  import ArticlesView from '$lib/views/ArticlesView.svelte';

  let { data } = $props();
</script>

<ArticlesView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  articles={data.articles}
  canCreate={data.canCreate}
/>
