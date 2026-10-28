<script lang="ts">
  import Members from '$lib/Members.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { page } from '$app/state';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<Members
  websiteOrigin={data.websiteOrigin}
  {language}
  administrator={data.user?.role === 'administrator'}
  memberId={page.params.id}
/>
