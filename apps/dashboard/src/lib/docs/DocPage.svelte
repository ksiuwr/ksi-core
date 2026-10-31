<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsOutline from '@ksi-core/ui/platform/DocsOutline.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors } from '@ksi-core/ui/platform/heading-anchors';
  import { SquarePen, Globe, CalendarDays, TriangleAlert } from '@lucide/svelte';
  import { formatDate, formatDateTime } from 'shared/format';
  import { associationDocsKey, docsPath } from 'shared/docs';
  import { preferences, setLanguage } from '$lib/preferences.svelte';
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
  const anchorLabels = { copyLabel: 'Skopiuj link do tej sekcji', copiedLabel: 'Skopiowano link' };
  const date = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'long', year: 'numeric' });
  const publicUrl = $derived(
    `${websiteOrigin}/docs/${encodeURIComponent(slug ?? associationDocsKey)}/${encodeURIComponent(page.slug)}`
  );
</script>

<div class="doc-page">
  <article class="doc-article" lang={page.locale}>
    <!-- Most visits are for reading, so details and editing stay one quiet click away. -->
    <header class="doc-header">
      <h1>{page.displayTitle}</h1>
      <div class="doc-byline">
        <span class="doc-updated"
          ><CalendarDays size={14} aria-hidden="true" /><span
            >Zaktualizowano
            <time
              datetime={page.updatedAt}
              title={formatDateTime(page.updatedAt, language, {
                dateStyle: 'full',
                timeStyle: 'long'
              })}>{date(page.updatedAt)}</time
            ></span
          ></span
        >
        {#if page.public}<span class="doc-public"
            ><Globe size={13} aria-hidden="true" />Publiczna</span
          >{/if}
        <span class="doc-tools">
          {#if page.access.canReview}
            <a class="btn ghost btn-sm" href={docsPath(slug, page.slug, 'edit')}
              ><SquarePen aria-hidden="true" />Edytuj</a
            >
          {:else if page.access.canPropose}
            <a class="btn ghost btn-sm" href={docsPath(slug, page.slug, 'edit')}
              ><SquarePen aria-hidden="true" />Zaproponuj zmiany</a
            >
          {/if}
          <DocInfo {page} {slug} {publicUrl} />
        </span>
      </div>
    </header>

    {#if page.outdatedLocales.includes(page.locale)}
      <p class="doc-outdated" role="note">
        <TriangleAlert size={15} aria-hidden="true" />
        <span>
          Wersja polska zmieniła się po przygotowaniu tego tłumaczenia.
          <button type="button" onclick={() => setLanguage('pl')}>Czytaj wersję polską</button>
        </span>
      </p>
    {/if}

    <div class="doc-outline"><DocsOutline headings={page.headings} {content} {onhash} /></div>

    <div
      class="doc-content doc-prose"
      bind:this={content}
      use:headingAnchors={{ onhash, ...anchorLabels }}
    >
      {#if page.markdown.trim()}
        <Markdown blocks={page.blocks} {language} />
      {:else}
        <p class="muted">Ta strona jest pusta.</p>
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
    padding-bottom: 22px;
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
    color: var(--positive);
  }
  .doc-outdated {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin: 20px 0 0;
    padding: 10px 12px;
    border-radius: var(--radius-lg);
    background: var(--coral);
    font-size: 13px;
  }
  .doc-outdated :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .doc-outdated button {
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    margin-left: 4px;
    color: var(--accent);
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
  }
  .doc-toc {
    position: sticky;
    top: 24px;
  }
  .doc-outline {
    display: none;
    margin-top: 20px;
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
