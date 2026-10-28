<script lang="ts">
  import ForumView from '$lib/views/ForumView.svelte';

  let { data } = $props();
</script>

<ForumView workspace="project" projectSlug={data.project?.slug ?? ''} threads={data.threads} />
