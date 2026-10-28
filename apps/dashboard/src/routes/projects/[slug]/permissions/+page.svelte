<script lang="ts">
  import ProjectPermissions from '$lib/ProjectPermissions.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

{#if data.project}
  <ProjectPermissions project={data.project} onrefresh={invalidateAll} />
{/if}
