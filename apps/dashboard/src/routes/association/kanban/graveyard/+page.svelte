<script lang="ts">
  import GraveyardView from '$lib/views/GraveyardView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<GraveyardView
  workspace="association"
  projectSlug=""
  items={data.items}
  statuses={data.statuses}
  {language}
  refresh={invalidateAll}
/>
