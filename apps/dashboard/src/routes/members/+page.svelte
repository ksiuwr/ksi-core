<script lang="ts">
  import Members from '$lib/Members.svelte';
  import { preferences } from '$lib/preferences.svelte';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<div class="workspace-header">
  <div>
    <h1>{'Members'}</h1>
  </div>
</div>
<Members
  websiteOrigin={data.websiteOrigin}
  {language}
  administrator={data.user?.role === 'administrator'}
/>
