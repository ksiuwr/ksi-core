<script lang="ts">
  import { ClickableCard, HStack, Text, VStack } from '@astryx-sv/core';
  import FieldTag from './FieldTag.svelte';
  import ProjectCover from './ProjectCover.svelte';

  let {
    project
  }: {
    project: {
      slug: string;
      name: string;
      description?: string | null;
      fields?: string[];
      tags?: string[];
    };
  } = $props();
</script>

<ClickableCard
  href={`/projects/${encodeURIComponent(project.slug)}`}
  label={project.name}
  padding={0}
  elevation="low"
>
  <VStack gap={0}>
    <ProjectCover
      slug={project.slug}
      fields={project.fields}
      class="border-line aspect-[5/3] border-b"
    />
    <VStack gap={3} padding={5}>
      {#if project.fields?.length}
        <HStack gap={1.5} wrap="wrap">
          {#each project.fields as field}<FieldTag {field} />{/each}
        </HStack>
      {/if}
      <Text type="large" weight="semibold" maxLines={2}>{project.name}</Text>
      {#if project.description}
        <Text type="supporting" color="secondary" maxLines={3}>{project.description}</Text>
      {/if}
      <Text type="code" color="secondary" maxLines={1}>
        {project.tags?.map((tag) => `#${tag}`).join(' ')}
      </Text>
    </VStack>
  </VStack>
</ClickableCard>
