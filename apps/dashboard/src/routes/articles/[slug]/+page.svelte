<script lang="ts">
  import ArticleView from '$lib/views/ArticleView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ArticleView
  workspace={data.workspace}
  projectSlug={data.articleProject?.slug ?? ''}
  article={data.article}
  permissions={data.permissions}
  websiteOrigin={data.websiteOrigin}
  {language}
  refresh={invalidateAll}
/>
