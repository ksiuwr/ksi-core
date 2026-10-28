<script lang="ts">
  import UserSettings from '$lib/UserSettings.svelte';
  import { preferences } from '$lib/preferences.svelte';

  const language = $derived(preferences.language);
</script>

<UserSettings {language} />
