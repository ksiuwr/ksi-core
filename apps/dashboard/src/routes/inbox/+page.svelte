<script lang="ts">
  import NotificationInbox from '$lib/NotificationInbox.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
  const language = $derived(preferences.language);
</script>

<div class="workspace-header">
  <div>
    <h1>{'Notifications'}</h1>
    <p class="workspace-description">
      {language === 'pl' ? 'Zobacz, co Cię ominęło.' : 'Catch up on what you missed.'}
    </p>
  </div>
</div>
<NotificationInbox
  fullPage
  {language}
  admin={data.inbox}
  administrator={data.user?.role === 'administrator'}
  refresh={invalidateAll}
  reportError={() => {}}
/>
