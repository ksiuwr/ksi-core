<script lang="ts">
  import NewTaskView from '$lib/views/NewTaskView.svelte';

  let { data } = $props();
</script>

<NewTaskView
  workspace="project"
  projectSlug={data.project?.slug ?? ''}
  projectId={data.project?.id ?? ''}
  board={data.board}
  items={data.items}
/>
