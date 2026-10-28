<script lang="ts">
  import NewThreadView from '$lib/views/NewThreadView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  const language = $derived(preferences.language);
</script>

<NewThreadView workspace="association" projectSlug="" projectId="" {language} />
