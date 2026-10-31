<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsOutline from '@ksi-core/ui/platform/DocsOutline.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors } from '@ksi-core/ui/platform/heading-anchors';
  import {
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    Lock,
    SquarePen,
    TriangleAlert
  } from '@lucide/svelte';
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
  const anchorLabels = { copyLabel: 'Copy link to this section', copiedLabel: 'Link copied' };
  let content = $state<HTMLDivElement>();
</script>

<svelte:head><title>{data.page.title} · KSI UWr</title></svelte:head>
<main class="doc-page">
  <div class="doc-layout">
    <article lang={data.page.locale}>
      <header class="doc-heading">
        <nav class="doc-breadcrumb" aria-label={'Breadcrumb'}>
          <a href="/docs">{'Docs'}</a>
          <ChevronRight size={13} aria-hidden="true" />
          {#if data.page.workspace.slug}
            <a href={`/projects/${encodeURIComponent(data.page.workspace.slug)}`}
              >{data.page.workspace.name}</a
            >
          {:else}
            <span>KSI</span>
          {/if}
          {#each folders as folder, index (index)}
            <ChevronRight size={13} aria-hidden="true" />
            <span>{folder}</span>
          {/each}
        </nav>
        <h1>{data.page.title}</h1>
        <div class="doc-meta">
          <p>
            {'Updated'}
            <time datetime={data.page.updatedAt}
              >{formatter.format(new Date(data.page.updatedAt))}</time
            >
          </p>
          {#if !data.page.public}<span class="doc-private"
              ><Lock size={13} aria-hidden="true" />{'Members only'}</span
            >{/if}
          {#if data.page.access?.canReview}
            <a class="doc-edit" href={editUrl}><SquarePen size={13} aria-hidden="true" />{'Edit'}</a
            >
          {:else if data.page.access?.canPropose}
            <a class="doc-edit" href={editUrl}
              ><SquarePen size={13} aria-hidden="true" />{'Suggest changes'}</a
            >
          {/if}
        </div>
      </header>
      {#if data.page.outdatedLocales.includes(data.page.locale)}
        <p class="doc-outdated" role="note">
          <TriangleAlert size={15} aria-hidden="true" />
          <span>
            {'The Polish version changed after this translation was written.'}
            <button type="button" onclick={() => setLocale('pl')}
              >{'Read the Polish version'}</button
            >
          </span>
        </p>
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
        <nav class="doc-pager" aria-label={'More pages'}>
          {#if neighbors.previous}
            <a
              class="surface-card surface-card-link"
              rel="prev"
              href={publicDocPath(workspace, neighbors.previous.slug)}
            >
              <span class="doc-pager-label"
                ><ArrowLeft size={14} aria-hidden="true" />{'Previous'}</span
              >
              <strong>{neighbors.previous.title}</strong>
            </a>
          {/if}
          {#if neighbors.next}
            <a
              class="surface-card surface-card-link doc-pager-next"
              rel="next"
              href={publicDocPath(workspace, neighbors.next.slug)}
            >
              <span class="doc-pager-label"
                >{'Next'}<ArrowRight size={14} aria-hidden="true" /></span
              >
              <strong>{neighbors.next.title}</strong>
            </a>
          {/if}
        </nav>
      {/if}
    </article>
    <aside class="doc-toc">
      <DocsToc headings={data.page.headings} {content} {onhash} />
    </aside>
  </div>
</main>

<style>
  .doc-page {
    flex: 1;
    padding: 0;
  }
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
  .doc-heading {
    padding-bottom: 22px;
    border-bottom: 1px solid var(--line);
  }
  .doc-breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 6px;
    margin-bottom: 18px;
    color: var(--muted);
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .doc-breadcrumb a {
    color: inherit;
    text-decoration: none;
  }
  .doc-breadcrumb a:hover {
    color: var(--ink);
  }
  .doc-breadcrumb :global(svg) {
    flex-shrink: 0;
    opacity: 0.6;
  }
  h1 {
    margin: 0 0 14px;
    font-size: clamp(30px, 4vw, 46px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.045em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    color: var(--muted);
    font-size: 12px;
  }
  .doc-meta p {
    margin: 0;
  }
  .doc-private {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  /* Quiet like the rest of the byline: most visits only read, and editing happens in the
     dashboard. */
  .doc-edit {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: -4px -8px -4px auto;
    padding: 4px 8px;
    border-radius: var(--radius-md);
    color: inherit;
    text-decoration: none;
  }
  .doc-edit:hover {
    color: var(--ink);
    background: var(--surface-muted);
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
    margin-top: 3px;
  }
  .doc-outdated button {
    margin-left: 4px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--accent);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
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
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
  .doc-pager a {
    display: grid;
    gap: 4px;
    padding: 14px 16px;
    color: var(--ink);
  }
  .doc-pager-next {
    grid-column: 2;
    text-align: right;
  }
  .doc-pager-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 12px;
  }
  .doc-pager-next .doc-pager-label {
    justify-content: flex-end;
  }
  .doc-pager strong {
    font-size: 14px;
    font-weight: 500;
    overflow-wrap: anywhere;
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
    .doc-pager {
      grid-template-columns: minmax(0, 1fr);
    }
    .doc-pager-next {
      grid-column: 1;
    }
  }
</style>
