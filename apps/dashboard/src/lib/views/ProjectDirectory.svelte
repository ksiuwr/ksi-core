<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import {
    Button,
    Card,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { ArrowUpRight, FolderOpen, Plus } from '@lucide/svelte';
  import type { Project } from '$lib/types';

  let { projects, role }: { projects: Project[]; role: string } = $props();
  const language = $derived(preferences.language);
</script>

<VStack gap={6}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <VStack gap={1}>
      <Heading level={1}>Projekty</Heading>
      <Text as="p" class="workspace-description">Wybierz projekt i rozpocznij współpracę.</Text>
    </VStack>
    {#if role !== 'member'}
      <Button href="/projects/new" variant="primary" label="Nowy projekt">
        {#snippet icon()}<Plus size={16} aria-hidden="true" />{/snippet}
      </Button>
    {/if}
  </HStack>

  {#if projects.length}
    <Grid columns={{ minWidth: 280, max: 3 }} gap={4}>
      {#each projects as project (project.id)}
        <Card padding={5}>
          <VStack gap={3}>
            <HStack gap={1.5} wrap="wrap">
              {#each project.fields as field (field)}
                <Token color="green" label={field} />
              {/each}
              {#if project.locked}
                <Token color="orange" label="Zamknięty" />
              {/if}
            </HStack>
            <Heading level={2}>{project.name}</Heading>
            <MarkdownContent value={project.description} />
            <HStack>
              <Button
                href={`/projects/${encodeURIComponent(project.slug)}`}
                variant="primary"
                label="Otwórz projekt"
              >
                {#snippet endContent()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
              </Button>
            </HStack>
          </VStack>
        </Card>
      {/each}
    </Grid>
  {:else}
    <EmptyState
      title="Jeszcze nie ma projektów"
      description="Nowe projekty pojawią się tutaj."
      headingLevel={2}
    >
      {#snippet icon()}<Icon icon={FolderOpen} size="lg" color="secondary" />{/snippet}
    </EmptyState>
  {/if}
</VStack>
