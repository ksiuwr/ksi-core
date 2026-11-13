<script lang="ts">
  import { Badge } from '@astryx-sv/core';

  let { field }: { field: string } = $props();

  const variant = $derived(
    field === 'research' ? 'purple' : field === 'community' ? 'orange' : 'teal'
  );
</script>

<Badge
  {variant}
  label={field === 'research' ? 'Badania' : field === 'community' ? 'Społeczność' : 'Inżynieria'}
/>
