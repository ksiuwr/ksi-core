<script lang="ts">
  import Docs from '$lib/docs/Docs.svelte';

  let { data } = $props();
</script>

<Docs
  projectId=""
  projectSlug=""
  workspaceName={'Całe koło'}
  data={data.docs}
  websiteOrigin={data.websiteOrigin}
/>
