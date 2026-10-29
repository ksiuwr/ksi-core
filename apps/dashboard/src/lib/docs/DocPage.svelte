<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors, scrollToSection } from '@ksi-core/ui/platform/heading-anchors';
  import { SquarePen, Globe, CalendarDays, TextAlignStart, ChevronDown } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { associationDocsKey, docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocInfo from './DocInfo.svelte';
  import type { DocDetail } from './docs';

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
  const anchorLabels = { copyLabel: 'Copy link to this section', copiedLabel: 'Link copied' };
  const date = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'long', year: 'numeric' });
  const publicUrl = $derived(
    `${websiteOrigin}/docs/${encodeURIComponent(slug ?? associationDocsKey)}/${encodeURIComponent(page.slug)}`
  );
</script>

<div class="doc-page">
  <article class="doc-article">
    <!-- Most visits are for reading, so details and editing stay one quiet click away. -->
    <header class="doc-header">
      <h1>{page.title}</h1>
      <div class="doc-byline">
        <span class="doc-updated"
          ><CalendarDays size={14} aria-hidden="true" /><span
            >{'Updated'} <time datetime={page.updatedAt}>{date(page.updatedAt)}</time></span
          ></span
        >
        {#if page.public}<span class="doc-public"
            ><Globe size={13} aria-hidden="true" />{'Public'}</span
          >{/if}
        <span class="doc-tools">
          {#if page.access.canReview}
            <a class="btn ghost btn-sm" href={docsPath(slug, page.slug, 'edit')}
              ><SquarePen aria-hidden="true" />{'Edit'}</a
            >
          {:else if page.access.canPropose}
            <a class="btn ghost btn-sm" href={docsPath(slug, page.slug, 'edit')}
              ><SquarePen aria-hidden="true" />{'Suggest changes'}</a
            >
          {/if}
          <DocInfo {page} {slug} {publicUrl} />
        </span>
      </div>
    </header>

    {#if page.headings.length}
      <details class="doc-outline">
        <summary
          ><TextAlignStart size={15} aria-hidden="true" />{'On this page'}<ChevronDown
            size={15}
            aria-hidden="true"
          /></summary
        >
        <ol>
          {#each page.headings as heading (heading.id)}
            <li style:padding-left={`${Math.min(heading.level - 1, 3) * 14}px`}>
              <a
                href={`#${heading.id}`}
                onclick={(event) => {
                  if (!content) return;
                  event.preventDefault();
                  const url = new URL(location.href);
                  url.hash = heading.id;
                  onhash(url);
                  scrollToSection(content, heading.id);
                }}>{heading.text}</a
              >
            </li>
          {/each}
        </ol>
      </details>
    {/if}

    <div class="doc-content" bind:this={content} use:headingAnchors={{ onhash, ...anchorLabels }}>
      {#if page.markdown.trim()}
        <Markdown blocks={page.blocks} {language} />
      {:else}
        <p class="muted">{'This page is empty.'}</p>
      {/if}
    </div>
  </article>
  <aside class="doc-toc">
    <DocsToc headings={page.headings} {content} {onhash} />
  </aside>
</div>

<style>
  .doc-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 48px;
    align-items: start;
  }
  .doc-article {
    min-width: 0;
    max-width: 760px;
  }
  .doc-header {
    padding: 8px 0 22px;
    border-bottom: 1px solid var(--line);
  }
  .doc-header h1 {
    margin: 0 0 14px;
    font-size: clamp(30px, 4vw, 46px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.045em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .doc-byline {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 14px;
    color: var(--muted);
    font-size: 12px;
  }
  .doc-updated,
  .doc-public {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .doc-public {
    color: #2f7d4a;
  }
  .doc-tools {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }
  .doc-tools > :global(.btn.ghost) {
    color: var(--muted);
  }
  .doc-tools > :global(.btn.ghost:hover) {
    color: var(--ink);
  }
  .doc-content {
    padding-top: 28px;
    font-size: 16px;
    line-height: 1.75;
    color: color-mix(in oklch, var(--ink) 88%, var(--muted));
  }
  .doc-content :global(.markdown :is(h1, h2, h3, h4)) {
    color: var(--ink);
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .doc-content :global(.markdown h1) {
    font-size: 1.9em;
  }
  .doc-content :global(.markdown h2) {
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
    font-size: 1.5em;
  }
  .doc-content :global(.markdown h3) {
    font-size: 1.2em;
  }
  .doc-content :global(.markdown h4) {
    font-size: 1em;
  }
  .doc-content :global(.markdown :not(pre) > code) {
    padding: 0.1em 0.35em;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
    font-size: 0.88em;
  }
  .doc-toc {
    position: sticky;
    top: 24px;
  }
  .doc-outline {
    display: none;
    margin-top: 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    font-size: 13px;
  }
  .doc-outline summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    color: var(--muted);
    cursor: pointer;
    list-style: none;
  }
  .doc-outline summary::-webkit-details-marker {
    display: none;
  }
  .doc-outline summary :global(svg:last-child) {
    margin-left: auto;
  }
  .doc-outline ol {
    margin: 0;
    padding: 0 12px 10px;
    list-style: none;
  }
  .doc-outline a {
    display: block;
    padding: 4px 0;
    color: var(--ink);
    text-decoration: none;
  }
  @media (max-width: 1100px) {
    .doc-page {
      grid-template-columns: minmax(0, 1fr);
    }
    .doc-toc {
      display: none;
    }
    .doc-outline {
      display: block;
    }
  }
</style>
