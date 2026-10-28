<script lang="ts">
  import WorkspaceMembers from '$lib/WorkspaceMembers.svelte';
  import { page } from '$app/state';

  let { data } = $props();
</script>

<WorkspaceMembers
  memberId={page.params.id}
  websiteOrigin={data.websiteOrigin}
  elevated={data.user?.role !== 'member'}
/>
