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
<main class="article-page page-container">
  <div class="column">
    <a class="back-link" href="/articles"
      ><ArrowLeft size={16} aria-hidden="true" />Wszystkie artykuły</a
    >
    <article>
      <header class="article-heading">
        {#if data.article.project}<a
            class="project-link"
            href={`/projects/${encodeURIComponent(data.article.project.slug)}`}
            ><Folder size={14} aria-hidden="true" />{data.article.project.name}<ArrowUpRight
              size={13}
              aria-hidden="true"
            /></a
          >{/if}
        <h1>{data.article.title}</h1>
        <div class="byline">
          {#if data.article.authors.length}<div class="authors" role="group" aria-label={'Autorzy'}>
              {#each data.article.authors as author (author.id)}<MemberPreview
                  member={author}
                  href={`/members/${encodeURIComponent(author.id)}`}
                  avatarOnly
                />{/each}
            </div>{/if}
          {#if published && !Number.isNaN(published.getTime())}<div class="publication-date">
              <CalendarDays size={15} aria-hidden="true" /><span
                >Opublikowano
                <time datetime={published.toISOString()}>{formatter.format(published)}</time></span
              >
            </div>{/if}
        </div>
      </header>
      <div class="article-content"><Markdown blocks={data.blocks} {language} /></div>
    </article>
  </div>
  {#if data.article.related?.length}<section class="related" aria-labelledby="related-heading">
      <div class="section-heading">
        <h2 id="related-heading">Czytaj dalej</h2>
        <a class="back-link" href="/articles"
          >Wszystkie artykuły<ArrowUpRight size={15} aria-hidden="true" /></a
        >
      </div>
      <div class="related-grid">
        {#each data.article.related as article (article.id)}<a
            class="related-card surface-card"
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
    flex: 1;
    padding-top: 28px;
    padding-bottom: 80px;
  }
  .column {
    max-width: 760px;
    margin-inline: auto;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 13px;
    padding-block: 6px;
  }
  .back-link:hover {
    color: var(--ink);
  }
  .article-heading {
    padding: 36px 0 28px;
    border-bottom: 1px solid var(--line);
  }
  .project-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
    color: var(--muted);
    margin-bottom: 20px;
    transition:
      color var(--dur-fast) ease,
      border-color var(--dur-fast) ease;
  }
  .project-link:hover {
    color: var(--ink);
    border-color: var(--control-border-hover);
  }
  h1 {
    font-size: clamp(34px, 5vw, 56px);
    line-height: 1.08;
    letter-spacing: -0.045em;
    font-weight: 700;
    margin: 0 0 24px;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .byline {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }
  .authors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .publication-date {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
  }
  .article-content {
    padding-block: 32px 56px;
    font-size: 17px;
    line-height: 1.8;
    color: color-mix(in oklch, var(--ink) 88%, var(--muted));
  }
  .article-content :global(h1),
  .article-content :global(h2),
  .article-content :global(h3) {
    margin: 1.6em 0 0.6em;
    line-height: 1.25;
    font-weight: 600;
    color: var(--ink);
  }
  .article-content :global(h1) {
    font-size: 2em;
  }
  .article-content :global(h2) {
    font-size: 1.5em;
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
  .article-content :global(li::marker) {
    color: var(--muted);
  }
  .article-content :global(a) {
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--accent) 45%, transparent);
    text-underline-offset: 3px;
  }
  .article-content :global(a:hover) {
    text-decoration-color: var(--accent);
  }
  .article-content :global(blockquote) {
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 20px;
    color: var(--muted);
    font-style: italic;
  }
  .article-content :global(:not(pre) > code) {
    padding: 0.1em 0.35em;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
    font-size: 0.88em;
  }
  .related {
    max-width: 1000px;
    margin-inline: auto;
    border-top: 1px solid var(--line);
    padding-top: 32px;
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
    letter-spacing: -0.03em;
  }
  .related-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .related-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 22px;
    min-height: 170px;
    color: var(--ink);
    transition:
      border-color var(--dur-fast) ease,
      box-shadow var(--dur) ease;
  }
  .related-card:hover {
    border-color: var(--control-border-hover);
    box-shadow: var(--shadow-md);
  }
  .related-context {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }
  h3 {
    font-size: 19px;
    line-height: 1.35;
    letter-spacing: -0.025em;
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
    transition: translate var(--dur) var(--ease-out);
  }
  .related-card:hover .related-footer :global(svg) {
    color: var(--ink);
    translate: 2px -2px;
  }
  @media (max-width: 600px) {
    .article-page {
      padding-top: 16px;
      padding-bottom: 48px;
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
      min-height: 140px;
      padding: 20px;
    }
  }
</style>
