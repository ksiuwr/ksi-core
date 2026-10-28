<script lang="ts">
  import Members from '$lib/Members.svelte';
  let { data } = $props();
</script>

<div class="workspace-header">
  <div>
    <h1>Members</h1>
  </div>
</div>
<Members websiteOrigin={data.websiteOrigin} administrator={data.user?.role === 'administrator'} />
