<script lang="ts">
  import Members from '$lib/Members.svelte';
  import { Heading } from '@astryx-sv/core';

  let { data } = $props();
</script>

<Heading level={1}>Członkowie</Heading>
<Members websiteOrigin={data.websiteOrigin} administrator={data.user?.role === 'administrator'} />
