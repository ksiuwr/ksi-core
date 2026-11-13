<script lang="ts">
  import '@ksi-core/ui/docs-prose.css';
  import DocPerson from './DocPerson.svelte';
  import {
    BookOpen,
    FileText,
    Globe,
    GitPullRequestArrow,
    UsersRound,
    Plus,
    Folder,
    ArrowRight
  } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocPage from './DocPage.svelte';
  import DocEditor from './DocEditor.svelte';
  import DocHistory from './DocHistory.svelte';
  import DocSuggestions from './DocSuggestions.svelte';
  import DocSuggestion from './DocSuggestion.svelte';
  import DocContributors from './DocContributors.svelte';
  import type { DocSummary } from './docs';
  import DocTree from './DocTree.svelte';
  import FloatingDocsNavigation from './FloatingDocsNavigation.svelte';
  import type {
    DocDetail,
    DocIndex,
    DocInsights,
    DocRevision,
    DocsView,
    SuggestionDetail,
    SuggestionSummary
  } from './docs';
  import {
    Badge,
    Button,
    Card,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    SideNavItem,
    StackItem,
    Text,
    VStack
  } from '@astryx-sv/core';

  let {
    projectId,
    projectSlug,
    workspaceName,
    data,
    websiteOrigin
  }: {
    /** Empty for the association workspace. */
    projectId: string;
    projectSlug: string;
    workspaceName: string;
    data: {
      view: DocsView;
      path: string[];
      index: DocIndex;
      page: DocDetail | null;
      revisions?: DocRevision[];
      suggestions?: SuggestionSummary[];
      resolved?: boolean;
      suggestion?: SuggestionDetail;
      insights?: DocInsights;
      /** The reader keeps the page tree docked beside the text. */
      navigationDocked: boolean;
    };
    websiteOrigin: string;
  } = $props();

  const language = $derived(preferences.language);
  const slug = $derived(projectSlug || null);
  const home = $derived(hrefFor());
  const view = $derived(data.view);
  const index = $derived(data.index);
  const first = $derived(data.path[0]);
  // Pages without a folder come first, then one section per folder path.
  const groups = $derived(
    Object.entries(
      Object.groupBy(index.pages, (page) => page.folder) as Record<string, DocSummary[]>
    )
      .map(([folder, pages]) => ({
        folder,
        pages: pages.sort((a, b) => a.title.localeCompare(b.title))
      }))
      .sort((a, b) => (a.folder && b.folder ? a.folder.localeCompare(b.folder) : a.folder ? 1 : -1))
  );
  function hrefFor(...segments: string[]) {
    return docsPath(slug, ...segments);
  }
  const updated = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<HStack class="docs-layout" gap={4} vAlign="start">
  {#if view !== 'history'}
    <StackItem size="static">
      <FloatingDocsNavigation label={'Dokumentacja'} docked={data.navigationDocked}>
        <nav aria-label={'Dokumentacja'}>
          <VStack gap={0.5}>
            <SideNavItem href={home} label="Przegląd" size="sm" isSelected={view === 'index'}>
              {#snippet icon()}<Icon icon={BookOpen} size="sm" />{/snippet}
            </SideNavItem>
            <DocTree {index} {projectId} {slug} selected={first} />
            <!-- Collaboration tools stay below the pages, quieter than the reading links. -->
            <VStack gap={0} class="docs-nav-tools">
              <SideNavItem
                href={hrefFor('suggestions')}
                label="Propozycje zmian"
                size="sm"
                isSelected={view === 'suggestions' || view === 'suggestion'}
              >
                {#snippet icon()}<Icon icon={GitPullRequestArrow} size="sm" />{/snippet}
                {#snippet endContent()}
                  {#if index.pendingSuggestions}
                    <Badge variant="neutral" label={String(index.pendingSuggestions)} />
                  {/if}
                {/snippet}
              </SideNavItem>
              <SideNavItem
                href={hrefFor('contributors')}
                label="Autorzy"
                size="sm"
                isSelected={view === 'contributors'}
              >
                {#snippet icon()}<Icon icon={UsersRound} size="sm" />{/snippet}
              </SideNavItem>
            </VStack>
          </VStack>
        </nav>
      </FloatingDocsNavigation>
    </StackItem>
  {/if}

  <StackItem size="fill" class="docs-main">
    <!-- Views keep editor and selection state, so each address starts fresh. -->
    {#key data.path.join('/')}
      {#if view === 'index'}
        <HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
          <VStack gap={1}>
            <Text type="supporting" class="workspace-eyebrow">{workspaceName}</Text>
            <Heading level={1}>Dokumentacja</Heading>
            <Text as="p" class="workspace-description">
              Jak działa ta przestrzeń — spisane dla wszystkich, którzy przyjdą po nas.
            </Text>
          </VStack>
          {#if index.access.canPropose}
            <Button
              href={hrefFor('new')}
              label={index.access.canReview ? 'Nowa strona' : 'Zaproponuj stronę'}
            >
              {#snippet icon()}<Icon icon={Plus} size="sm" />{/snippet}
            </Button>
          {/if}
        </HStack>
        {#if index.access.canReview && index.pendingSuggestions}
          <List class="docs-callout">
            <ListItem href={hrefFor('suggestions')} align="center">
              {#snippet startContent()}
                <Icon icon={GitPullRequestArrow} size="md" color="accent" />
              {/snippet}
              {#snippet label()}
                <Text>
                  Propozycje czekające na Twoją ocenę:
                  <strong>{index.pendingSuggestions}</strong>
                </Text>
              {/snippet}
              {#snippet endContent()}<Icon
                  icon={ArrowRight}
                  size="sm"
                  color="secondary"
                />{/snippet}
            </ListItem>
          </List>
        {/if}
        {#if index.pages.length}
          {#each groups as group (group.folder)}
            <VStack as="section" gap={3} class="docs-group" aria-label={group.folder || undefined}>
              {#if group.folder}
                <HStack gap={2} vAlign="center">
                  <Icon icon={Folder} size="sm" color="secondary" />
                  <Heading level={2} class="docs-group-title">
                    {group.folder.split('/').join(' / ')}
                  </Heading>
                </HStack>
              {/if}
              <Grid columns={{ minWidth: 280, max: 4 }} gap={3}>
                {#each group.pages as page (page.id)}
                  <a class="docs-card" href={hrefFor(page.slug)}>
                    <Card padding={5} height="100%">
                      <VStack gap={3} height="100%">
                        <HStack gap={2} vAlign="start">
                          <Icon icon={FileText} size="sm" color="accent" />
                          <StackItem size="fill">
                            <Text size="lg" weight="semibold" class="docs-card-title"
                              >{page.title}</Text
                            >
                          </StackItem>
                          {#if page.public}
                            <Icon icon={Globe} size="sm" color="success" label={'Publiczna'} />
                          {/if}
                        </HStack>
                        {#if page.excerpt}
                          <Text type="supporting" class="docs-card-excerpt">{page.excerpt}</Text>
                        {/if}
                        <HStack class="docs-card-meta" hAlign="between" vAlign="center" gap={2}>
                          <HStack gap={1} class="docs-card-people">
                            {#each page.contributors.slice(0, 4) as person (person.id)}
                              <DocPerson {person} size={22} showName={false} />
                            {/each}
                          </HStack>
                          <Text type="supporting">
                            Zaktualizowano
                            <time datetime={page.updatedAt}>{updated(page.updatedAt)}</time>
                          </Text>
                        </HStack>
                      </VStack>
                    </Card>
                  </a>
                {/each}
              </Grid>
            </VStack>
          {/each}
        {:else}
          <EmptyState
            title="Brak dokumentacji"
            description="Zapisz, jak tu wszystko działa, żeby kolejny zespół nie zaczynał od zera."
            headingLevel={2}
          >
            {#snippet icon()}<Icon icon={BookOpen} size="lg" color="secondary" />{/snippet}
          </EmptyState>
        {/if}
      {:else if view === 'page' && data.page}
        <DocPage page={data.page} {slug} {websiteOrigin} />
      {:else if (view === 'edit' && data.page) || view === 'new'}
        <DocEditor
          {projectId}
          {slug}
          page={data.page}
          access={index.access}
          folders={index.folders}
          {workspaceName}
        />
      {:else if view === 'history' && data.page}
        <DocHistory
          {projectId}
          {slug}
          page={data.page}
          revisions={data.revisions ?? []}
          version={data.path[2] ? Number(data.path[2]) : null}
        />
      {:else if view === 'suggestions'}
        <DocSuggestions
          {slug}
          {workspaceName}
          suggestions={data.suggestions ?? []}
          resolved={!!data.resolved}
        />
      {:else if view === 'suggestion' && data.suggestion}
        <DocSuggestion {projectId} {slug} suggestion={data.suggestion} />
      {:else if view === 'contributors' && data.insights}
        <DocContributors insights={data.insights} {workspaceName} />
      {/if}
    {/key}
  </StackItem>
</HStack>

<style>
  /* The rail sizes its own column, so docking widens it without a second width here. */
  :global(.docs-main) {
    min-width: 0;
  }
  :global(.docs-group) + :global(.docs-group) {
    margin-top: var(--spacing-7);
  }
  :global(.docs-group-title) {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--color-text-secondary);
  }
  :global(.docs-nav-tools) {
    gap: 1px;
    margin-top: var(--spacing-2);
    padding-top: var(--spacing-2);
    border-top: 1px solid var(--color-border);
  }
  :global(.docs-callout) {
    margin-bottom: var(--spacing-6);
  }
  .docs-card {
    display: block;
    height: 100%;
    color: var(--color-text-primary);
    text-decoration: none;
  }
  :global(.docs-card-title) {
    overflow-wrap: anywhere;
  }
  :global(.docs-card-excerpt) {
    line-height: 1.55;
  }
  :global(.docs-card-meta) {
    margin-top: auto;
    gap: var(--spacing-2-5);
  }
  :global(.docs-card-people) {
    display: flex;
    gap: 3px;
  }
  @media (max-width: 760px) {
    :global(.docs-layout) {
      flex-direction: column !important;
      align-items: stretch;
    }
    :global(.docs-main) {
      flex: none;
      width: 100%;
    }
  }
</style>
