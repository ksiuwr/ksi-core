<script lang="ts">
  import WorkspaceOverview from '$lib/views/WorkspaceOverview.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<WorkspaceOverview
  workspace="project"
  project={data.project}
  access={data.projectAccess}
  {language}
  websiteOrigin={data.websiteOrigin}
/>
