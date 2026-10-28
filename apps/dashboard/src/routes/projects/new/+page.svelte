<script lang="ts">
  import ProjectCreate from '$lib/views/ProjectCreate.svelte';
  import { preferences } from '$lib/preferences.svelte';

  const language = $derived(preferences.language);
</script>

<ProjectCreate {language} />
