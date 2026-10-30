<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import { headingAnchors } from '@ksi-core/ui/platform/heading-anchors';
  import { ArrowLeft, ArrowUpRight, CalendarDays, Folder } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const language = $derived(locale.current);
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const onhash = (url: URL) => replaceState(url, {});
  const anchorLabels = { copyLabel: 'Copy link to this section', copiedLabel: 'Link copied' };
  let content = $state<HTMLDivElement>();
</script>

<svelte:head><title>{data.page.title} · KSI UWr</title></svelte:head>
<main class="doc-page">
  <a class="back-link" href="/docs"><ArrowLeft size={16} aria-hidden="true" />All documentation</a>
  <div class="doc-layout">
    <article lang={data.page.locale}>
      <header class="doc-heading">
        {#if data.page.workspace.slug}<a
            class="project-link"
            href={`/projects/${encodeURIComponent(data.page.workspace.slug)}`}
            ><Folder size={14} aria-hidden="true" />{data.page.workspace.name}<ArrowUpRight
              size={13}
              aria-hidden="true"
            /></a
          >{/if}
        <h1>{data.page.title}</h1>
        <div class="doc-meta">
          <p class="updated">
            <CalendarDays size={15} aria-hidden="true" /><span>{'Updated'}</span>
            <time datetime={data.page.updatedAt}
              >{formatter.format(new Date(data.page.updatedAt))}</time
            >
          </p>
        </div>
        {#if data.page.folder}
          <p class="doc-folder">
            <Folder size={13} aria-hidden="true" />{data.page.folder.split('/').join(' / ')}
          </p>
        {/if}
        {#if data.page.outdatedLocales.includes(data.page.locale)}
          <p class="doc-translation-notice">
            {'This translation may be outdated. Check the English version for the latest changes.'}
          </p>
        {/if}
      </header>
      <div class="doc-content" bind:this={content} use:headingAnchors={{ onhash, ...anchorLabels }}>
        <Markdown blocks={data.page.blocks} {language} />
      </div>
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
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding-block: 6px;
    color: var(--muted);
    font-size: 13px;
  }
  .back-link:hover {
    color: var(--ink);
  }
  .doc-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 200px;
    gap: 36px;
    align-items: start;
  }
  article {
    min-width: 0;
    max-width: 760px;
  }
  .doc-heading {
    padding: 36px 0 28px;
    border-bottom: 1px solid var(--line);
  }
  .project-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
  }
  .project-link:hover {
    color: var(--ink);
    border-color: var(--control-border-hover);
  }
  h1 {
    margin: 0 0 20px;
    font-size: clamp(34px, 5vw, 56px);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.045em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .doc-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .doc-folder {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    color: var(--muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .doc-translation-notice {
    margin-top: 16px;
    color: var(--muted);
    font-size: 13px;
  }
  .updated {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 12px;
  }
  .doc-content {
    padding-block: 32px 56px;
    font-size: 17px;
    line-height: 1.8;
    color: color-mix(in oklch, var(--ink) 88%, var(--muted));
  }
  /* Sections stop below the sticky site header. */
  .doc-content :global([id^='section-']) {
    scroll-margin-top: 76px;
  }
  .doc-content :global(.markdown :is(h1, h2, h3, h4)) {
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .doc-content :global(.markdown h1) {
    font-size: 2em;
  }
  .doc-content :global(.markdown h2) {
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
    font-size: 1.5em;
  }
  .doc-content :global(.markdown h3) {
    font-size: 1.2em;
  }
  .doc-content :global(.markdown :is(ul, ol)) {
    padding-left: 1.5em;
  }
  .doc-content :global(.markdown ul) {
    list-style: disc;
  }
  .doc-content :global(.markdown ol) {
    list-style: decimal;
  }
  .doc-content :global(.markdown li::marker) {
    color: var(--muted);
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
    top: 84px;
  }
  @media (max-width: 1279px) {
    .doc-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .doc-toc {
      display: none;
    }
  }
</style>
