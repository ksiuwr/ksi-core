<script lang="ts">
  import ForumView from '$lib/views/ForumView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ForumView
  workspace="association"
  projectSlug=""
  projectId=""
  threads={data.threads}
  {language}
  refresh={invalidateAll}
/>
