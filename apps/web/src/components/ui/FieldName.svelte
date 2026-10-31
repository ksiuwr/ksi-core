<script lang="ts">
  let { field }: { field: string } = $props();
</script>

{#if field === 'research'}
  Badania
{:else if field === 'community'}
  Społeczność
{:else}
  Inżynieria
{/if}
