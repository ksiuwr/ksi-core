<script lang="ts">
  import ProjectSettings from '$lib/ProjectSettings.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

{#if data.project}
  <ProjectSettings
    project={data.project}
    {language}
    websiteOrigin={data.websiteOrigin}
    canEdit={data.projectAccess.canEdit}
    canManageMembers={data.projectAccess.canManageMembers}
    onrefresh={invalidateAll}
  />
{/if}
