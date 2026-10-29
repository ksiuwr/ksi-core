<script lang="ts">
  import WorkspaceOverview from '$lib/views/WorkspaceOverview.svelte';

  let { data } = $props();
</script>

<WorkspaceOverview
  workspace="association"
  project={null}
  access={data.projectAccess}
  websiteOrigin={data.websiteOrigin}
  board={data.board}
  items={data.items}
  threads={data.threads}
  threadCount={data.threadCount}
  members={data.members}
  articleCount={data.articleCount}
  docCount={data.docCount}
/>
