<script lang="ts">
  import ProjectDirectory from '$lib/views/ProjectDirectory.svelte';

  let { data } = $props();
</script>

<ProjectDirectory projects={data.projects} role={data.user?.role ?? 'member'} />
