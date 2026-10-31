<script lang="ts">
  import NotificationInbox from '$lib/NotificationInbox.svelte';
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();
</script>

<div class="workspace-header">
  <div>
    <h1>Powiadomienia</h1>
    <p class="workspace-description">Zobacz, co Cię ominęło.</p>
  </div>
</div>
<NotificationInbox
  fullPage
  admin={data.inbox}
  administrator={data.user?.role === 'administrator'}
  refresh={invalidateAll}
  reportError={() => {}}
/>
