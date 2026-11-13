<script lang="ts">
  import { Card, Grid, Skeleton as AstryxSkeleton, VStack } from '@astryx-sv/core';

  let { board = false, label }: { board?: boolean; label: string } = $props();
</script>

<VStack gap={6} role="status" aria-label={label}>
  <AstryxSkeleton width={220} height={30} />
  <Grid columns={{ minWidth: 240, max: 3 }} gap={4}>
    {#each [1, 2, 3] as n (n)}
      <Card padding={5} minHeight={board ? 330 : 110}>
        <VStack gap={3}>
          <AstryxSkeleton height={12} index={n} />
          <AstryxSkeleton height={12} index={n + 1} />
          <AstryxSkeleton height={12} width="60%" index={n + 2} />
        </VStack>
      </Card>
    {/each}
  </Grid>
</VStack>
