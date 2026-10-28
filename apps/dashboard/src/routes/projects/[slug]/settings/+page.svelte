<script lang="ts">
  import ProjectSettings from '$lib/ProjectSettings.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

{#if data.project}
  <ProjectSettings
    project={data.project}
    websiteOrigin={data.websiteOrigin}
    canEdit={data.projectAccess.canEdit}
    canManageMembers={data.projectAccess.canManageMembers}
    onrefresh={invalidateAll}
  />
{/if}
