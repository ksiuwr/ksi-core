<script lang="ts">
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowLeft, ArrowUpRight, Folder, CalendarDays } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const language = $derived(locale.current);
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const published = $derived(data.article.publishedAt ? new Date(data.article.publishedAt) : null);
</script>

<svelte:head><title>{data.article.title} · KSI UWr</title></svelte:head>
<main class="article-page page-gutter">
  <a class="back-link" href="/articles"><ArrowLeft size={16} aria-hidden="true" />All articles</a>
  <article>
    <header class="article-heading">
      {#if data.article.project}<a
          class="project-link"
          href={`/projects/${encodeURIComponent(data.article.project.slug)}`}
          ><Folder size={15} aria-hidden="true" />{data.article.project.name}<ArrowUpRight
            size={14}
            aria-hidden="true"
          /></a
        >{/if}
      <h1>{data.article.title}</h1>
      <div class="byline">
        {#if data.article.authors.length}<div class="authors" role="group" aria-label={'Authors'}>
            {#each data.article.authors as author (author.id)}<MemberPreview
                member={author}
                href={`/members/${encodeURIComponent(author.id)}`}
                avatarOnly
                {language}
              />{/each}
          </div>{/if}
        {#if published && !Number.isNaN(published.getTime())}<div class="publication-date">
            <CalendarDays size={15} aria-hidden="true" /><span
              >{'Published'}
              <time datetime={published.toISOString()}>{formatter.format(published)}</time></span
            >
          </div>{/if}
      </div>
    </header>
    <div class="article-content"><Markdown blocks={data.blocks} {language} /></div>
  </article>
  {#if data.article.related?.length}<section class="related" aria-labelledby="related-heading">
      <div class="section-heading">
        <h2 id="related-heading">Keep reading</h2>
        <a class="back-link" href="/articles"
          >All articles<ArrowUpRight size={15} aria-hidden="true" /></a
        >
      </div>
      <div class="related-grid">
        {#each data.article.related as article (article.id)}<a
            class="related-card"
            href={`/articles/${encodeURIComponent(article.slug)}`}
          >
            <span class="related-context">{article.project?.name ?? 'KSI'}</span>
            <h3>{article.title}</h3>
            <div class="related-footer">
              {#if article.publishedAt}<time datetime={article.publishedAt}
                  >{formatter.format(new Date(article.publishedAt))}</time
                >{/if}<ArrowUpRight size={18} aria-hidden="true" />
            </div>
          </a>{/each}
      </div>
    </section>{/if}
</main>

<style>
  .article-page {
    width: 100%;
    min-inline-size: min(100%, 36rem);
    max-width: 1000px;
    margin-inline: auto;
    padding-top: 40px;
    padding-bottom: 72px;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 13px;
    text-decoration: none;
    padding-block: 6px;
  }
  .back-link:hover {
    color: var(--ink);
  }
  .article-heading {
    padding: 38px 0 28px;
    border-bottom: 1px solid var(--line);
  }
  .project-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 8px 11px;
    border: 1px solid var(--line);
    border-radius: 3px;
    color: var(--muted);
    margin-bottom: 22px;
    text-decoration: none;
  }
  .project-link:hover {
    color: var(--ink);
    border-color: var(--control-border-hover);
  }
  h1 {
    font-size: clamp(32px, 4.5vw, 60px);
    line-height: 1.12;
    letter-spacing: -0.04em;
    font-weight: 600;
    margin: 0 0 26px;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .byline {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }
  .authors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .publication-date {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .article-content {
    padding-block: 30px 48px;
    max-width: 78ch;
    font-size: 17px;
    line-height: 1.8;
  }
  .article-content :global(h1),
  .article-content :global(h2),
  .article-content :global(h3) {
    margin: 1.5em 0 0.6em;
    line-height: 1.25;
    font-weight: 600;
  }
  .article-content :global(h1) {
    font-size: 2em;
  }
  .article-content :global(h2) {
    font-size: 1.55em;
  }
  .article-content :global(h3) {
    font-size: 1.2em;
  }
  .article-content :global(p),
  .article-content :global(ul),
  .article-content :global(ol),
  .article-content :global(blockquote) {
    margin-bottom: 1.2em;
  }
  .article-content :global(ul) {
    list-style: disc;
    padding-left: 1.5em;
  }
  .article-content :global(ol) {
    list-style: decimal;
    padding-left: 1.5em;
  }
  .article-content :global(a) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .article-content :global(blockquote) {
    border-left: 2px solid var(--line);
    padding-left: 20px;
    color: var(--muted);
  }
  .related {
    border-top: 1px solid var(--line);
    padding-top: 30px;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }
  h2 {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .related-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .related-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface);
    text-decoration: none;
    min-height: 180px;
  }
  .related-card:hover {
    border-color: var(--control-border-hover);
    outline: 1px solid var(--control-border-hover);
    outline-offset: 2px;
  }
  .related-context {
    color: var(--muted);
    font-size: 12px;
  }
  h3 {
    font-size: 20px;
    line-height: 1.35;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  .related-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    gap: 12px;
    color: var(--muted);
    font-size: 12px;
  }
  .related-footer :global(svg) {
    margin-left: auto;
  }
  @media (max-width: 600px) {
    .article-page {
      padding-top: 24px;
      padding-bottom: 40px;
    }
    .article-heading {
      padding-top: 24px;
    }
    .article-content {
      font-size: 16px;
    }
    .related-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .related-card {
      min-height: 150px;
      padding: 20px;
    }
  }
</style>
