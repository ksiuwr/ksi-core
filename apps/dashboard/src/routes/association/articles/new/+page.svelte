<script lang="ts">
  import NewArticleView from '$lib/views/NewArticleView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  const language = $derived(preferences.language);
</script>

<NewArticleView workspace="association" projectSlug="" projectId="" {language} />
