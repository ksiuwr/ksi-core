<script lang="ts">
  import EventsView from '$lib/views/EventsView.svelte';

  let { data } = $props();
</script>

<EventsView events={data.events} />
