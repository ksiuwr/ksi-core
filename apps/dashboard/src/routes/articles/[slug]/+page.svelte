<script lang="ts">
  import ArticleView from '$lib/views/ArticleView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<ArticleView
  workspace={data.workspace}
  projectSlug={data.articleProject?.slug ?? ''}
  article={data.article}
  permissions={data.permissions}
  websiteOrigin={data.websiteOrigin}
  refresh={invalidateAll}
/>
