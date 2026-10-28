<script lang="ts">
  import PreviewCredentials from '$lib/PreviewCredentials.svelte';

  let { data } = $props();
</script>

{#if data.project}
  <PreviewCredentials projectSlug={data.project.slug} />
{/if}
