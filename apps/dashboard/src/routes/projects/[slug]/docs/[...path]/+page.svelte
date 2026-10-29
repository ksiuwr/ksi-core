<script lang="ts">
  import Docs from '$lib/docs/Docs.svelte';

  let { data } = $props();
</script>

<Docs
  projectId={data.project?.id ?? ''}
  projectSlug={data.project?.slug ?? ''}
  workspaceName={data.project?.name ?? ''}
  data={data.docs}
  websiteOrigin={data.websiteOrigin}
/>
