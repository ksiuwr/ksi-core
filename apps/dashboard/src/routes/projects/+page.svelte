<script lang="ts">
  import ProjectDirectory from '$lib/views/ProjectDirectory.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ProjectDirectory projects={data.projects} role={data.user?.role ?? 'member'} {language} />
