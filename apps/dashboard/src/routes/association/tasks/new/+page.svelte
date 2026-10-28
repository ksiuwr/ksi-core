<script lang="ts">
  import NewTaskView from '$lib/views/NewTaskView.svelte';

  let { data } = $props();
</script>

<NewTaskView
  workspace="association"
  projectSlug=""
  projectId=""
  board={data.board}
  items={data.items}
/>
