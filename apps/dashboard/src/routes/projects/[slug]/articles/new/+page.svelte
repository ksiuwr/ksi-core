<script lang="ts">
  import NewArticleView from '$lib/views/NewArticleView.svelte';

  let { data } = $props();
</script>

<NewArticleView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
/>
