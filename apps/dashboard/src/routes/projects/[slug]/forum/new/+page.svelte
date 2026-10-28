<script lang="ts">
  import NewThreadView from '$lib/views/NewThreadView.svelte';

  let { data } = $props();
</script>

<NewThreadView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
/>
