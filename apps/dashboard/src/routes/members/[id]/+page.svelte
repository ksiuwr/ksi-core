<script lang="ts">
  import Members from '$lib/Members.svelte';
  import { page } from '$app/state';

  let { data } = $props();
</script>

<Members
  websiteOrigin={data.websiteOrigin}
  administrator={data.user?.role === 'administrator'}
  memberId={page.params.id}
/>
