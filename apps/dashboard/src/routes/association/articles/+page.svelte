<script lang="ts">
  import ArticlesView from '$lib/views/ArticlesView.svelte';

  let { data } = $props();
</script>

<ArticlesView
  workspace="association"
  projectSlug=""
  articles={data.articles}
  canCreate={data.canCreate}
/>
