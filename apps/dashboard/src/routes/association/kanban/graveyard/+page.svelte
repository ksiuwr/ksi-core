<script lang="ts">
  import GraveyardView from '$lib/views/GraveyardView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<GraveyardView
  workspace="association"
  projectSlug=""
  items={data.items}
  statuses={data.statuses}
  refresh={invalidateAll}
/>
