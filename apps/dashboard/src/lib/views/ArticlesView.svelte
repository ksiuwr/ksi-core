<script lang="ts">
  import { articlePath, newArticlePath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import {
    Badge,
    Button,
    EmptyState,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { FileText, Plus } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    articles,
    canCreate
  }: {
    workspace: Workspace;
    projectSlug: string;
    articles: Article[];
    canCreate: boolean;
  } = $props();
</script>

<VStack gap={4}>
  <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
    <VStack gap={1}>
      <Heading level={1}>Artykuły</Heading>
      <Text as="p" class="workspace-description">Pisz publikacje i proponuj zmiany.</Text>
    </VStack>
    {#if canCreate}
      <Button href={newArticlePath(workspace, projectSlug)} variant="primary" label="Nowy artykuł">
        {#snippet icon()}<Plus size={16} aria-hidden="true" />{/snippet}
      </Button>
    {/if}
  </HStack>

  {#if articles.length}
    <List hasDividers edge="outset">
      {#each articles as article (article.id)}
        <ListItem
          href={articlePath(article.slug)}
          label={article.title}
          description={article.slug}
          align="center"
        >
          {#snippet startContent()}
            <Icon icon={FileText} size="sm" color="secondary" />
          {/snippet}
          {#snippet endContent()}
            <HStack gap={2} vAlign="center" wrap="wrap">
              {#if article.mainArticle}
                <Token color="green" label="Główny artykuł projektu" />
              {/if}
              <Badge
                variant={article.state === 'published' ? 'success' : 'neutral'}
                label={article.state === 'published' ? 'Opublikowany' : 'Szkic'}
              />
            </HStack>
          {/snippet}
        </ListItem>
      {/each}
    </List>
  {:else}
    <EmptyState
      title="Brak artykułów"
      description="Utwórz pierwszy artykuł w tym obszarze roboczym."
      headingLevel={2}
    >
      {#snippet icon()}<Icon icon={FileText} size="lg" color="secondary" />{/snippet}
    </EmptyState>
  {/if}
</VStack>
