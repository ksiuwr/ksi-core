<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsOutline from '@ksi-core/ui/platform/DocsOutline.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors } from '@ksi-core/ui/platform/heading-anchors';
  import { SquarePen, Globe, CalendarDays } from '@lucide/svelte';
  import { formatDate, formatDateTime } from 'shared/format';
  import { associationDocsKey, docsPath } from 'shared/docs';
  import { preferences, setLanguage } from '$lib/preferences.svelte';
  import DocInfo from './DocInfo.svelte';
  import type { DocDetail } from './docs';
  import {
    Badge,
    Banner,
    Button,
    Heading,
    HStack,
    Icon,
    StackItem,
    Text,
    VStack
  } from '@astryx-sv/core';

  let {
    page,
    slug,
    websiteOrigin
  }: {
    page: DocDetail;
    slug: string | null;
    websiteOrigin: string;
  } = $props();

  let content = $state<HTMLDivElement>();
  const language = $derived(preferences.language);
  const onhash = (url: URL) => replaceState(url, {});
  const anchorLabels = { copyLabel: 'Skopiuj link do tej sekcji', copiedLabel: 'Skopiowano link' };
  const date = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'long', year: 'numeric' });
  const publicUrl = $derived(
    `${websiteOrigin}/docs/${encodeURIComponent(slug ?? associationDocsKey)}/${encodeURIComponent(page.slug)}`
  );
</script>

<HStack class="doc-page" gap={8} vAlign="start">
  <article class="doc-article" lang={page.locale}>
    <VStack gap={0}>
      <!-- Most visits are for reading, so details and editing stay one quiet click away. -->
      <VStack gap={3} class="doc-header">
        <Heading level={1} class="doc-title">{page.displayTitle}</Heading>
        <HStack class="doc-byline" gap={3} vAlign="center" wrap="wrap">
          <HStack gap={1.5} vAlign="center">
            <Icon icon={CalendarDays} size="sm" color="secondary" />
            <Text type="supporting">
              Zaktualizowano
              <time
                datetime={page.updatedAt}
                title={formatDateTime(page.updatedAt, language, {
                  dateStyle: 'full',
                  timeStyle: 'long'
                })}>{date(page.updatedAt)}</time
              >
            </Text>
          </HStack>
          {#if page.public}
            <Badge variant="success" label="Publiczna">
              {#snippet icon()}<Icon icon={Globe} size="xsm" />{/snippet}
            </Badge>
          {/if}
          <HStack class="doc-tools" gap={0.5} vAlign="center">
            {#if page.access.canReview}
              <Button
                href={docsPath(slug, page.slug, 'edit')}
                variant="ghost"
                size="sm"
                label="Edytuj"
              >
                {#snippet icon()}<Icon icon={SquarePen} size="sm" />{/snippet}
              </Button>
            {:else if page.access.canPropose}
              <Button
                href={docsPath(slug, page.slug, 'edit')}
                variant="ghost"
                size="sm"
                label="Zaproponuj zmiany"
              >
                {#snippet icon()}<Icon icon={SquarePen} size="sm" />{/snippet}
              </Button>
            {/if}
            <DocInfo {page} {slug} {publicUrl} />
          </HStack>
        </HStack>
      </VStack>

      {#if page.outdatedLocales.includes(page.locale)}
        <Banner
          status="warning"
          title="Wersja polska zmieniła się po przygotowaniu tego tłumaczenia."
          container="section"
          role="note"
        >
          {#snippet endContent()}
            <Button
              variant="ghost"
              size="sm"
              label="Czytaj wersję polską"
              onclick={() => setLanguage('pl')}
            />
          {/snippet}
        </Banner>
      {/if}

      <VStack gap={0} class="doc-outline">
        <DocsOutline headings={page.headings} {content} {onhash} />
      </VStack>

      <div
        class="doc-content doc-prose"
        bind:this={content}
        use:headingAnchors={{ onhash, ...anchorLabels }}
      >
        {#if page.markdown.trim()}
          <Markdown blocks={page.blocks} {language} />
        {:else}
          <Text as="p" type="supporting">Ta strona jest pusta.</Text>
        {/if}
      </div>
    </VStack>
  </article>
  <StackItem size="static">
    <aside class="doc-toc">
      <DocsToc headings={page.headings} {content} {onhash} />
    </aside>
  </StackItem>
</HStack>

<style>
  .doc-article {
    flex: 1 1 0;
    min-width: 0;
    max-width: 760px;
  }
  :global(.doc-header) {
    padding-bottom: var(--spacing-5);
    border-bottom: 1px solid var(--color-border);
  }
  :global(.doc-title) {
    font-size: clamp(var(--font-size-4xl), 4vw, var(--font-size-5xl));
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.045em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  :global(.doc-tools) {
    margin-left: auto;
  }
  .doc-content {
    padding-top: var(--spacing-7);
  }
  .doc-toc {
    position: sticky;
    top: var(--spacing-6);
    width: 220px;
  }
  :global(.doc-outline) {
    display: none;
    margin-top: var(--spacing-5);
  }
  @media (max-width: 1100px) {
    :global(.doc-page) {
      flex-direction: column !important;
      align-items: stretch;
    }
    .doc-article {
      flex: none;
      width: 100%;
    }
    .doc-toc {
      display: none;
    }
    :global(.doc-outline) {
      display: flex;
    }
  }
</style>
