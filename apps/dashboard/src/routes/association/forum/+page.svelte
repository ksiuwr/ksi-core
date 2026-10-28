<script lang="ts">
  import ForumView from '$lib/views/ForumView.svelte';

  let { data } = $props();
</script>

<ForumView workspace="association" projectSlug="" threads={data.threads} />
