<script lang="ts">
  import ForumView from '$lib/views/ForumView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ForumView workspace="association" projectSlug="" threads={data.threads} {language} />
