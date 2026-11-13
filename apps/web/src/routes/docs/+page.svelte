<script lang="ts">
  import { BookOpen, Lock } from '@lucide/svelte';
  import {
    ClickableCard,
    EmptyState,
    Grid,
    HStack,
    Heading,
    Icon,
    StatusDot,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { publicDocPages, publicDocPath, publicDocWorkspaces } from 'shared/public-docs';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const workspaces = $derived(publicDocWorkspaces(data.pages, locale.current));
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<svelte:head><title>Dokumentacja · KSI UWr</title></svelte:head>

{#snippet lockIcon()}
  <Icon icon={Lock} size="xsm" />
{/snippet}

{#snippet emptyIcon()}
  <Icon icon={BookOpen} size="lg" color="secondary" />
{/snippet}

<VStack as="main" gap={10} maxWidth={920} class="w-full flex-1">
  <VStack as="header" gap={4}>
    <HStack gap={2} vAlign="center">
      <StatusDot variant="accent" label="Dokumentacja" />
      <Text type="code" color="secondary" class="tracking-wider uppercase">Dokumentacja</Text>
    </HStack>
    <Heading level={1} type="display-1">Dokumentacja</Heading>
    <Text type="large" color="secondary" class="max-w-xl">
      Jak działa KSI i jego projekty — opisane otwarcie przez naszych członków.
    </Text>
  </VStack>

  {#each workspaces as workspace (workspace.slug)}
    <VStack as="section" gap={4} aria-labelledby={`workspace-${workspace.slug}`}>
      <Heading level={2} id={`workspace-${workspace.slug}`}>{workspace.name}</Heading>
      <Grid columns={{ minWidth: 300, max: 3 }} gap={3}>
        {#each publicDocPages(workspace) as page (page.slug)}
          <ClickableCard
            href={publicDocPath(workspace.slug, page.slug)}
            label={page.title}
            padding={5}
            elevation="low"
          >
            <VStack gap={2} height="100%">
              {#if page.folderTrail.length}
                <Text type="code" color="secondary" maxLines={1}>
                  {page.folderTrail.map((folder) => folder.name).join(' / ')}
                </Text>
              {/if}
              <Heading level={3}>{page.title}</Heading>
              {#if page.excerpt}
                <Text type="supporting" color="secondary" maxLines={3}>{page.excerpt}</Text>
              {/if}
              <HStack gap={2} justify="between" vAlign="center" wrap="wrap" class="mt-auto pt-1.5">
                <Text type="supporting" color="secondary">
                  <time datetime={page.updatedAt}>{formatter.format(new Date(page.updatedAt))}</time
                  >
                </Text>
                {#if !page.public}
                  <Token label="Tylko dla członków" color="gray" icon={lockIcon} size="sm" />
                {/if}
              </HStack>
            </VStack>
          </ClickableCard>
        {/each}
      </Grid>
    </VStack>
  {:else}
    <EmptyState title="Brak publicznej dokumentacji." icon={emptyIcon} />
  {/each}
</VStack>
