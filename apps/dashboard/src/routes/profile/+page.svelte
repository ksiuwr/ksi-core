<script lang="ts">
  import ProfileView from '$lib/views/ProfileView.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<ProfileView
  profile={data.profile}
  avatarRequest={data.avatarRequest}
  activeSessions={data.activeSessions}
  websiteOrigin={data.websiteOrigin}
  {language}
  refresh={invalidateAll}
/>
