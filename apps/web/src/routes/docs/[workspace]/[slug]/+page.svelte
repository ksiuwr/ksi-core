<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsOutline from '@ksi-core/ui/platform/DocsOutline.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors } from '@ksi-core/ui/platform/heading-anchors';
  import { ArrowLeft, ArrowRight, Lock, SquarePen } from '@lucide/svelte';
  import {
    Banner,
    BreadcrumbItem,
    Breadcrumbs,
    Button,
    ClickableCard,
    Grid,
    HStack,
    Heading,
    Icon,
    Text,
    Token,
    VStack
  } from '@astryx-sv/core';
  import { associationDocsKey, docsPath } from 'shared/docs';
  import { publicDocNeighbors, publicDocPath } from 'shared/public-docs';
  import { locale, setLocale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const language = $derived(locale.current);
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const workspace = $derived(data.page.workspace.slug ?? associationDocsKey);
  const folders = $derived(data.page.folder ? data.page.folder.split('/') : []);
  const neighbors = $derived(
    publicDocNeighbors(data.publicDocs, workspace, data.page.slug, locale.current)
  );
  const editUrl = $derived(
    `${data.dashboardOrigin}${docsPath(data.page.workspace.slug, data.page.slug, 'edit')}`
  );
  const onhash = (url: URL) => replaceState(url, {});
  const anchorLabels = { copyLabel: 'Skopiuj link do tej sekcji', copiedLabel: 'Skopiowano link' };
  let content = $state<HTMLDivElement>();
</script>

<svelte:head><title>{data.page.title} · KSI UWr</title></svelte:head>

{#snippet lockIcon()}
  <Icon icon={Lock} size="xsm" />
{/snippet}

{#snippet editIcon()}
  <Icon icon={SquarePen} size="sm" />
{/snippet}

{#snippet previousIcon()}
  <Icon icon={ArrowLeft} size="sm" />
{/snippet}

{#snippet nextIcon()}
  <Icon icon={ArrowRight} size="sm" />
{/snippet}

<VStack as="main" gap={0} class="doc-page flex-1">
  <div class="doc-layout">
    <article>
      <VStack gap={4} paddingBlockEnd={5} class="doc-heading border-line border-b">
        <Breadcrumbs label="Okruszki nawigacyjne" variant="supporting" separator="›">
          <BreadcrumbItem href="/docs">Dokumentacja</BreadcrumbItem>
          {#if data.page.workspace.slug}
            <BreadcrumbItem href={`/projects/${encodeURIComponent(data.page.workspace.slug)}`}>
              {data.page.workspace.name}
            </BreadcrumbItem>
          {:else}
            <BreadcrumbItem>KSI</BreadcrumbItem>
          {/if}
          {#each folders as folder, index (index)}
            <BreadcrumbItem>{folder}</BreadcrumbItem>
          {/each}
        </Breadcrumbs>
        <Heading level={1} type="display-1" textWrap="balance">{data.page.title}</Heading>
        <HStack gap={3} wrap="wrap" vAlign="center">
          <Text type="supporting" color="secondary">
            Zaktualizowano
            <time datetime={data.page.updatedAt}>
              {formatter.format(new Date(data.page.updatedAt))}
            </time>
          </Text>
          {#if !data.page.public}
            <Token label="Tylko dla członków" color="gray" icon={lockIcon} size="sm" />
          {/if}
          {#if data.page.access?.canReview}
            <Button href={editUrl} variant="ghost" size="sm" label="Edytuj" icon={editIcon} />
          {:else if data.page.access?.canPropose}
            <Button
              href={editUrl}
              variant="ghost"
              size="sm"
              label="Zaproponuj zmiany"
              icon={editIcon}
            />
          {/if}
        </HStack>
      </VStack>

      {#if data.page.outdatedLocales.includes(data.page.locale)}
        <Banner
          status="warning"
          title="Wersja polska zmieniła się po przygotowaniu tego tłumaczenia."
          collapsible={false}
          role="note"
          class="mt-5"
        >
          {#snippet endContent()}
            <Button
              variant="secondary"
              size="sm"
              label="Czytaj wersję polską"
              onclick={() => setLocale('pl')}
            />
          {/snippet}
        </Banner>
      {/if}

      <div class="doc-outline">
        <DocsOutline headings={data.page.headings} {content} {onhash} />
      </div>
      <div
        class="doc-content doc-prose"
        bind:this={content}
        use:headingAnchors={{ onhash, ...anchorLabels }}
      >
        <Markdown blocks={data.page.blocks} {language} />
      </div>

      {#if neighbors.previous || neighbors.next}
        <nav class="doc-pager" aria-label="Więcej stron">
          <Grid columns={{ minWidth: 260, max: 2 }} gap={3}>
            {#if neighbors.previous}
              <ClickableCard
                href={publicDocPath(workspace, neighbors.previous.slug)}
                label={neighbors.previous.title}
                padding={4}
                elevation="low"
              >
                <VStack gap={1}>
                  <HStack gap={1.5} vAlign="center">
                    {@render previousIcon()}
                    <Text type="supporting" color="secondary">Poprzednia</Text>
                  </HStack>
                  <Text weight="medium">{neighbors.previous.title}</Text>
                </VStack>
              </ClickableCard>
            {/if}
            {#if neighbors.next}
              <ClickableCard
                href={publicDocPath(workspace, neighbors.next.slug)}
                label={neighbors.next.title}
                padding={4}
                elevation="low"
                class="doc-pager-next"
              >
                <VStack gap={1} hAlign="end" class="text-right">
                  <HStack gap={1.5} vAlign="center">
                    <Text type="supporting" color="secondary">Następna</Text>
                    {@render nextIcon()}
                  </HStack>
                  <Text weight="medium">{neighbors.next.title}</Text>
                </VStack>
              </ClickableCard>
            {/if}
          </Grid>
        </nav>
      {/if}
    </article>
    <aside class="doc-toc">
      <DocsToc headings={data.page.headings} {content} {onhash} />
    </aside>
  </div>
</VStack>

<style>
  .doc-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 48px;
    align-items: start;
  }
  article {
    min-width: 0;
    max-width: 760px;
  }
  .doc-outline {
    display: none;
    margin-top: 20px;
  }
  .doc-content {
    padding-top: 28px;
  }
  /* Sections stop below the sticky site header. */
  .doc-content :global([id^='section-']) {
    scroll-margin-top: 76px;
  }
  .doc-pager {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
  .doc-pager :global(.doc-pager-next) {
    grid-column: 2;
  }
  .doc-toc {
    position: sticky;
    top: 88px;
  }
  @media (max-width: 1279px) {
    .doc-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .doc-toc {
      display: none;
    }
    .doc-outline {
      display: block;
    }
  }
  @media (max-width: 520px) {
    .doc-pager :global(.doc-pager-next) {
      grid-column: 1;
    }
  }
</style>
