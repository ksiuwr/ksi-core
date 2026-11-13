<script lang="ts">
  import { markdownImages } from 'shared/markdown-images';
  import { ClickableCard, EmptyState, HStack, Heading, Icon, Text, VStack } from '@astryx-sv/core';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowUpRight, CalendarDays, Newspaper } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';

  type Article = {
    id: string;
    slug: string;
    title: string;
    markdown: string;
    thumbnailFileId?: string | null;
    publishedAt?: string | null;
    authors: {
      id: string;
      name: string;
      image?: string | null;
      nickname?: string | null;
      bio?: string | null;
    }[];
  };

  let { articles }: { articles: Article[] } = $props();
  let failedThumbnails = $state<Record<string, boolean>>({});
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
  function preview(markdown: string) {
    // Remove the complete image token, including its optional width annotation.
    const images = markdownImages(markdown);
    for (let index = images.length - 1; index >= 0; index--) {
      const image = images[index]!;
      markdown = markdown.slice(0, image.start) + markdown.slice(image.end);
    }
    const text = markdown
      .replace(/:::gallery[\s\S]*?:::/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/^[\s#>*-]+/gm, '')
      .replace(/[*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 240 ? `${text.slice(0, 240).replace(/\s+\S*$/, '')}…` : text;
  }
</script>

{#snippet cardBody(article: Article)}
  <VStack gap={3} padding={5} class="min-w-0 flex-1">
    <Heading level={3}>{article.title}</Heading>
    {#if article.markdown}
      <Text type="supporting" color="secondary" maxLines={2}>{preview(article.markdown)}</Text>
    {/if}
    <HStack gap={3} vAlign="center" wrap="wrap" class="mt-auto pt-4">
      {#if article.authors.length}
        <HStack gap={1.5} wrap="wrap" role="group" aria-label="Autorzy">
          {#each article.authors as author (author.id)}
            <MemberPreview
              member={author}
              href={`/members/${encodeURIComponent(author.id)}`}
              avatarOnly
              size={28}
            />
          {/each}
        </HStack>
      {/if}
      {#if article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())}
        <HStack gap={1.5} vAlign="center">
          <Icon icon={CalendarDays} size="sm" color="secondary" />
          <Text type="supporting" color="secondary">
            <time datetime={article.publishedAt}>
              {formatter.format(new Date(article.publishedAt))}
            </time>
          </Text>
        </HStack>
      {/if}
      <Icon icon={ArrowUpRight} size="md" color="secondary" className="ml-auto shrink-0" />
    </HStack>
  </VStack>
{/snippet}

<VStack gap={4}>
  {#each articles as article (article.id)}
    <ClickableCard
      href={`/articles/${encodeURIComponent(article.slug)}`}
      label={article.title}
      padding={0}
      elevation="low"
    >
      {#if article.thumbnailFileId && !failedThumbnails[article.id]}
        <HStack gap={0} vAlign="stretch" class="flex-col sm:flex-row">
          <div class="thumbnail w-full sm:w-56 sm:shrink-0">
            <img
              src={`/media/${encodeURIComponent(article.thumbnailFileId)}`}
              alt=""
              loading="lazy"
              onerror={() => (failedThumbnails[article.id] = true)}
            />
          </div>
          {@render cardBody(article)}
        </HStack>
      {:else}
        {@render cardBody(article)}
      {/if}
    </ClickableCard>
  {:else}
    {#snippet emptyIcon()}
      <Icon icon={Newspaper} size="lg" color="secondary" />
    {/snippet}
    <EmptyState title="Nie ma jeszcze opublikowanych artykułów." icon={emptyIcon} />
  {/each}
</VStack>

<style>
  .thumbnail {
    min-width: 0;
    overflow: hidden;
    background: var(--surface-muted);
  }
  .thumbnail img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 160px;
    object-fit: cover;
  }
  @media (max-width: 640px) {
    .thumbnail img {
      aspect-ratio: 16 / 9;
      min-height: 0;
    }
  }
</style>
