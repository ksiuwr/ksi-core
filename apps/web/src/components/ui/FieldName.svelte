<script lang="ts">
  let { field }: { field: string } = $props();
</script>

{#if field === 'research'}
  Research
{:else if field === 'community'}
  Community
{:else}
  Engineering
{/if}
