<script lang="ts">
  import WorkspaceMembers from '$lib/WorkspaceMembers.svelte';

  let { data } = $props();
</script>

<WorkspaceMembers websiteOrigin={data.websiteOrigin} elevated={data.user?.role !== 'member'} />
