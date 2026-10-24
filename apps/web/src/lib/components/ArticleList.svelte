<script lang="ts">
  import { articleThumbnail } from 'shared/article-thumbnail';
  import { markdownImages } from 'shared/markdown-images';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowUpRight, CalendarDays } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let {
    articles
  }: {
    articles: {
      id: string;
      slug: string;
      title: string;
      markdown: string;
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
  const language = $derived(locale.current === 'pl' ? 'pl' : 'en');
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
    {@const thumbnail = articleThumbnail(article.markdown)}
    <article class="article-card">
      {#if thumbnail}<a
          class="thumbnail"
          href={`/articles/${encodeURIComponent(article.slug)}`}
          aria-label={article.title}
        >
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            onerror={(event) => {
              event.currentTarget.setAttribute('hidden', '');
            }}
          />
        </a>{/if}
      <a class="article-link" href={`/articles/${encodeURIComponent(article.slug)}`}>
        <h3>{article.title}</h3>
        <ArrowUpRight size={20} aria-hidden="true" />
      </a>
      {#if article.markdown}<p class="preview">{preview(article.markdown)}</p>{/if}
      <div class="metadata">
        {#if article.authors.length}<div class="authors" role="group" aria-label={'Authors'}>
            {#each article.authors as author (author.id)}
              <MemberPreview
                member={author}
                href={`/members/${encodeURIComponent(author.id)}`}
                avatarOnly
                {language}
              />
            {/each}
          </div>{/if}
        {#if article.publishedAt && !Number.isNaN(new Date(article.publishedAt).getTime())}
          <span class="date"
            ><CalendarDays size={15} aria-hidden="true" /><time datetime={article.publishedAt}
              >{formatter.format(new Date(article.publishedAt))}</time
            ></span
          >
        {/if}
      </div>
    </article>
  {:else}<p class="empty">No published articles yet.</p>{/each}
</div>

<style>
  .article-list {
    display: grid;
    gap: 16px;
  }
  .thumbnail {
    display: block;
    margin-bottom: 20px;
  }
  .thumbnail img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 3px;
  }
  .article-card {
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--surface);
    min-width: 0;
  }
  .article-card:focus-within,
  .article-card:hover {
    border-color: var(--control-border-hover);
  }
  .article-link {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    color: var(--ink);
    text-decoration: none;
  }
  .article-link :global(svg) {
    flex-shrink: 0;
    margin-top: 4px;
  }
  h3 {
    font-size: 22px;
    line-height: 1.35;
    font-weight: 600;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .article-link:hover h3 {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .preview {
    color: var(--muted);
    margin-top: 12px;
    line-height: 1.7;
    font-size: 15px;
    overflow-wrap: anywhere;
  }
  .metadata {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 20px;
  }
  .authors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .date {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .empty {
    color: var(--muted);
  }
  @media (max-width: 600px) {
    .article-card {
      padding: 20px;
    }
    h3 {
      font-size: 20px;
    }
  }
</style>
