<script lang="ts">
  import { Card, Heading, Button, VStack } from '@astryx-sv/core';
  import ProjectCover from './ProjectCover.svelte';
</script>

<Card padding={0}>
  <VStack gap={0} class="relative isolate overflow-hidden">
    <span class="absolute inset-0 -z-10 opacity-60">
      <ProjectCover slug="ksi" fields={['community']} width={1200} height={260} class="size-full" />
    </span>
    <VStack
      gap={6}
      padding={8}
      class="from-surface via-surface/90 bg-gradient-to-r to-transparent md:flex-row md:items-center md:justify-between"
    >
      <Heading level={2} id="contact-banner-heading">Masz pomysł na projekt?</Heading>
      <Button href="mailto:ksi@cs.uni.wroc.pl" variant="primary" size="lg" label="Napisz do nas" />
    </VStack>
  </VStack>
</Card>
