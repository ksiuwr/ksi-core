<script lang="ts">
  import { markdownImages } from 'shared/markdown-images';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowUpRight, CalendarDays, Newspaper } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let {
    articles
  }: {
    articles: {
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
    }[];
  } = $props();
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

<div class="article-list">
  {#each articles as article (article.id)}
    <article class="article-card group surface-card">
      {#if article.thumbnailFileId}
        <div class="thumbnail">
          <img
            src={`/media/${encodeURIComponent(article.thumbnailFileId)}`}
            alt=""
            loading="lazy"
            onerror={(event) => {
              event.currentTarget.parentElement?.setAttribute('hidden', '');
            }}
          />
        </div>
      {/if}
      <div class="body">
        <h3>
          <!-- The link covers the whole card; author links sit above it. -->
          <a class="article-link" href={`/articles/${encodeURIComponent(article.slug)}`}
            >{article.title}</a
          >
        </h3>
        {#if article.markdown}<p class="preview">{preview(article.markdown)}</p>{/if}
        <div class="metadata">
          {#if article.authors.length}<div class="authors" role="group" aria-label={'Autorzy'}>
              {#each article.authors as author (author.id)}
                <MemberPreview
                  member={author}
                  href={`/members/${encodeURIComponent(author.id)}`}
                  avatarOnly
                  size={28}
                />
              {/each}
            </div>{/if}
          {#if article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())}
            <span class="date"
              ><CalendarDays size={14} aria-hidden="true" /><time datetime={article.publishedAt}
                >{formatter.format(new Date(article.publishedAt))}</time
              ></span
            >
          {/if}
          <ArrowUpRight class="arrow" size={18} aria-hidden="true" />
        </div>
      </div>
    </article>
  {:else}
    <div class="empty">
      <Newspaper size={22} aria-hidden="true" />
      <p>Nie ma jeszcze opublikowanych artykułów.</p>
    </div>
  {/each}
</div>

<style>
  .article-list {
    display: grid;
    gap: 14px;
  }
  .article-card {
    position: relative;
    display: grid;
    min-width: 0;
    overflow: hidden;
    transition:
      border-color var(--dur-fast) ease,
      box-shadow var(--dur) ease;
  }
  .article-card:hover,
  .article-card:focus-within {
    border-color: var(--control-border-hover);
    box-shadow: var(--shadow-md);
  }
  .article-card:has(> .thumbnail:not([hidden])) {
    grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  }
  .thumbnail {
    border-right: 1px solid var(--line);
    background: var(--surface-muted);
  }
  .thumbnail img {
    width: 100%;
    height: 100%;
    min-height: 160px;
    display: block;
    object-fit: cover;
  }
  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 22px 24px;
  }
  h3 {
    font-size: 20px;
    line-height: 1.3;
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  .article-link {
    color: var(--ink);
  }
  .article-link::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  .article-link:focus-visible {
    outline: none;
  }
  .article-card:has(.article-link:focus-visible) {
    outline: 2px solid var(--ring-strong);
    outline-offset: 2px;
  }
  .preview {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    color: var(--muted);
    margin-top: 8px;
    line-height: 1.65;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
  .metadata {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 16px;
    margin-top: auto;
    padding-top: 18px;
  }
  .authors {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .date {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }
  .metadata :global(.arrow) {
    margin-left: auto;
    color: var(--muted);
    transition:
      color var(--dur-fast) ease,
      translate var(--dur) var(--ease-out);
  }
  .article-card:hover :global(.arrow) {
    color: var(--ink);
    translate: 2px -2px;
  }
  .empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 40px 24px;
    border: 1px dashed var(--input);
    border-radius: var(--radius-xl);
    color: var(--muted);
    font-size: 14px;
  }
  @media (max-width: 640px) {
    .article-card:has(> .thumbnail:not([hidden])) {
      grid-template-columns: minmax(0, 1fr);
    }
    .thumbnail {
      border-right: 0;
      border-bottom: 1px solid var(--line);
    }
    .thumbnail img {
      aspect-ratio: 16 / 9;
      min-height: 0;
    }
    .body {
      padding: 18px 20px;
    }
    h3 {
      font-size: 18px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .article-card:hover :global(.arrow) {
      translate: none;
    }
  }
</style>
