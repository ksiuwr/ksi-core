<script lang="ts">
  import NotificationInbox from '$lib/NotificationInbox.svelte';
  import { invalidateAll } from '$app/navigation';
  import { Heading, Text, VStack } from '@astryx-sv/core';

  let { data } = $props();
</script>

<VStack gap={1}>
  <Heading level={1}>Powiadomienia</Heading>
  <Text color="secondary">Zobacz, co Cię ominęło.</Text>
</VStack>
<NotificationInbox
  fullPage
  admin={data.inbox}
  administrator={data.user?.role === 'administrator'}
  refresh={invalidateAll}
  reportError={() => {}}
/>
