<script lang="ts">
  import ProfileView from '$lib/views/ProfileView.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<ProfileView
  profile={data.profile}
  avatarRequest={data.avatarRequest}
  activeSessions={data.activeSessions}
  websiteOrigin={data.websiteOrigin}
  refresh={invalidateAll}
/>
