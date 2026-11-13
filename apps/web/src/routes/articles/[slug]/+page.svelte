<script lang="ts">
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowLeft, ArrowUpRight, Folder, CalendarDays } from '@lucide/svelte';
  import {
    Button,
    ClickableCard,
    Grid,
    HStack,
    Heading,
    Icon,
    Text,
    VStack
  } from '@astryx-sv/core';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const language = $derived(locale.current);
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const published = $derived(data.article.publishedAt ? new Date(data.article.publishedAt) : null);
</script>

<svelte:head><title>{data.article.title} · KSI UWr</title></svelte:head>

{#snippet backIcon()}
  <Icon icon={ArrowLeft} size="sm" />
{/snippet}

{#snippet folderIcon()}
  <Icon icon={Folder} size="sm" />
{/snippet}

{#snippet externalIcon()}
  <Icon icon={ArrowUpRight} size="sm" />
{/snippet}

<VStack as="main" gap={0} paddingBlockStart={6} class="page-container w-full flex-1 pb-20">
  <VStack gap={0} maxWidth={760} class="mx-auto w-full">
    <HStack>
      <Button
        href="/articles"
        variant="ghost"
        size="sm"
        label="Wszystkie artykuły"
        icon={backIcon}
      />
    </HStack>
    <article>
      <VStack
        as="header"
        gap={5}
        paddingBlockStart={8}
        paddingBlockEnd={6}
        class="border-line border-b"
      >
        {#if data.article.project}
          <HStack>
            <Button
              href={`/projects/${encodeURIComponent(data.article.project.slug)}`}
              variant="secondary"
              size="sm"
              label={data.article.project.name}
              icon={folderIcon}
              endContent={externalIcon}
            />
          </HStack>
        {/if}
        <Heading level={1} type="display-1" textWrap="balance">{data.article.title}</Heading>
        <HStack gap={4} wrap="wrap" vAlign="center">
          {#if data.article.authors.length}
            <HStack gap={1.5} wrap="wrap" role="group" aria-label="Autorzy">
              {#each data.article.authors as author (author.id)}
                <MemberPreview
                  member={author}
                  href={`/members/${encodeURIComponent(author.id)}`}
                  avatarOnly
                />
              {/each}
            </HStack>
          {/if}
          {#if published && !Number.isNaN(published.getTime())}
            <HStack gap={1.5} vAlign="center">
              <Icon icon={CalendarDays} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">
                Opublikowano
                <time datetime={published.toISOString()}>{formatter.format(published)}</time>
              </Text>
            </HStack>
          {/if}
        </HStack>
      </VStack>
      <VStack gap={0} class="article-content">
        <Markdown blocks={data.blocks} {language} />
      </VStack>
    </article>
  </VStack>

  {#if data.article.related?.length}
    <VStack
      as="section"
      gap={5}
      class="related border-line border-t pt-8"
      aria-labelledby="related-heading"
    >
      <HStack gap={3} justify="between" vAlign="center" wrap="wrap">
        <Heading level={2} id="related-heading">Czytaj dalej</Heading>
        <Button
          href="/articles"
          variant="ghost"
          size="sm"
          label="Wszystkie artykuły"
          endContent={externalIcon}
        />
      </HStack>
      <Grid columns={{ minWidth: 280, max: 2 }} gap={3}>
        {#each data.article.related as article (article.id)}
          <ClickableCard
            href={`/articles/${encodeURIComponent(article.slug)}`}
            label={article.title}
            padding={5}
            elevation="low"
          >
            <VStack gap={3} minHeight={170}>
              <Text type="code" color="secondary">{article.project?.name ?? 'KSI'}</Text>
              <Heading level={3}>{article.title}</Heading>
              <HStack gap={3} justify="between" vAlign="center" class="mt-auto">
                {#if article.publishedAt}
                  <Text type="supporting" color="secondary">
                    <time datetime={article.publishedAt}>
                      {formatter.format(new Date(article.publishedAt))}
                    </time>
                  </Text>
                {/if}
                <Icon
                  icon={ArrowUpRight}
                  size="md"
                  color="secondary"
                  className="ml-auto shrink-0"
                />
              </HStack>
            </VStack>
          </ClickableCard>
        {/each}
      </Grid>
    </VStack>
  {/if}
</VStack>

<style>
  :global(.related) {
    max-width: 1000px;
    margin-inline: auto;
  }
  :global(.article-content) {
    padding-block: 32px 56px;
    font-size: 1.0625rem;
    line-height: 1.8;
    color: color-mix(in oklch, var(--ink) 88%, var(--muted));
  }
  :global(.article-content) :global(h1),
  :global(.article-content) :global(h2),
  :global(.article-content) :global(h3) {
    margin: 1.6em 0 0.6em;
    line-height: 1.25;
    font-weight: 600;
    color: var(--ink);
  }
  :global(.article-content) :global(h1) {
    font-size: 2em;
  }
  :global(.article-content) :global(h2) {
    font-size: 1.5em;
  }
  :global(.article-content) :global(h3) {
    font-size: 1.2em;
  }
  :global(.article-content) :global(p),
  :global(.article-content) :global(ul),
  :global(.article-content) :global(ol),
  :global(.article-content) :global(blockquote) {
    margin-bottom: 1.2em;
  }
  :global(.article-content) :global(ul) {
    list-style: disc;
    padding-left: 1.5em;
  }
  :global(.article-content) :global(ol) {
    list-style: decimal;
    padding-left: 1.5em;
  }
  :global(.article-content) :global(li::marker) {
    color: var(--muted);
  }
  :global(.article-content) :global(a) {
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--accent) 45%, transparent);
    text-underline-offset: 3px;
  }
  :global(.article-content) :global(a:hover) {
    text-decoration-color: var(--accent);
  }
  :global(.article-content) :global(blockquote) {
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 20px;
    color: var(--muted);
    font-style: italic;
  }
  :global(.article-content) :global(:not(pre) > code) {
    padding: 0.1em 0.35em;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
    font-size: 0.88em;
  }
  @media (max-width: 600px) {
    :global(.article-content) {
      font-size: 1rem;
    }
  }
</style>
