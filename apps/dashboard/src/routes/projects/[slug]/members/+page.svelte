<script lang="ts">
  import WorkspaceMembers from '$lib/WorkspaceMembers.svelte';

  let { data } = $props();
</script>

<WorkspaceMembers
  projectId={data.project?.id}
  websiteOrigin={data.websiteOrigin}
  elevated={data.user?.role !== 'member'}
  canManage={data.projectAccess?.canManageMembers ?? false}
/>
