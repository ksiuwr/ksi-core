<script lang="ts">
  import Docs from '$lib/docs/Docs.svelte';

  let { data } = $props();
</script>

<Docs
  projectId=""
  projectSlug=""
  workspaceName={'Association'}
  data={data.docs}
  websiteOrigin={data.websiteOrigin}
/>
