<script lang="ts">
  import EventsView from '$lib/views/EventsView.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<EventsView events={data.events} {language} />
