<script lang="ts">
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocsToc from '@ksi-core/ui/platform/DocsToc.svelte';
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { headingAnchors, scrollToSection } from '@ksi-core/ui/platform/heading-anchors';
  import {
    SquarePen,
    History,
    Globe,
    Lock,
    GitPullRequestArrow,
    ArrowUpRight,
    TextAlignStart,
    ChevronDown
  } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { associationDocsKey, docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import type { DocDetail } from './docs';

  let {
    page,
    slug,
    workspaceName,
    websiteOrigin
  }: {
    page: DocDetail;
    slug: string | null;
    workspaceName: string;
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
    <header class="doc-header">
      <p class="doc-eyebrow">
        <a href={docsPath(slug)}>{workspaceName}</a><span aria-hidden="true">/</span
        >{'Documentation'}
      </p>
      <h1>{page.title}</h1>
      <dl class="doc-meta">
        <div>
          <dt>{'Updated'}</dt>
          <dd>
            <time datetime={page.updatedAt}>{date(page.updatedAt)}</time>
            {#if page.updatedByUser}· {page.updatedByUser.name}{/if}
          </dd>
        </div>
        <div>
          <dt>{'Created'}</dt>
          <dd>
            <time datetime={page.createdAt}>{date(page.createdAt)}</time>
            {#if page.createdByUser}· {page.createdByUser.name}{/if}
          </dd>
        </div>
        <div>
          <dt>{'Version'}</dt>
          <dd>{page.version}</dd>
        </div>
        <div>
          <dt>{'Visibility'}</dt>
          <dd>
            {#if page.public}<span class="doc-visibility public"
                ><Globe size={13} aria-hidden="true" />{'Public on the website'}</span
              >{:else}<span class="doc-visibility"
                ><Lock size={13} aria-hidden="true" />{'Members only'}</span
              >{/if}
          </dd>
        </div>
      </dl>
      <div class="doc-actions">
        {#if page.access.canReview}
          <a class="btn" href={docsPath(slug, page.slug, 'edit')}
            ><SquarePen size={15} aria-hidden="true" />{'Edit page'}</a
          >
        {:else if page.access.canPropose}
          <a class="btn" href={docsPath(slug, page.slug, 'edit')}
            ><SquarePen size={15} aria-hidden="true" />{'Suggest changes'}</a
          >
        {/if}
        <a class="btn btn-outline" href={docsPath(slug, page.slug, 'history')}
          ><History size={15} aria-hidden="true" />{'History'}</a
        >
        {#if page.public}
          <a class="btn btn-outline" href={publicUrl} target="_blank" rel="noopener noreferrer"
            ><ArrowUpRight size={15} aria-hidden="true" />{'View on website'}</a
          >
        {/if}
        {#if page.pendingSuggestions}
          <a class="doc-pending" href={docsPath(slug, 'suggestions')}
            ><GitPullRequestArrow size={14} aria-hidden="true" />{'Pending suggestions'}: {page.pendingSuggestions}</a
          >
        {/if}
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

    {#if page.contributors.length}
      <section class="doc-contributors" aria-labelledby="doc-contributors-heading">
        <h2 id="doc-contributors-heading">{'Contributors'}</h2>
        <ul>
          {#each page.contributors as contribution (contribution.user.id)}
            <li>
              <MemberPreview
                member={contribution.user}
                href={`/people/${encodeURIComponent(contribution.user.id)}`}
                size={30}
              />
              <span class="doc-contribution">
                {'Changes'}: {contribution.revisions}
                <span class="added">+{contribution.additions}</span>
                <span class="removed">−{contribution.deletions}</span>
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </article>
  <aside class="doc-toc">
    <DocsToc headings={page.headings} {content} {onhash} />
  </aside>
</div>

<style>
  .doc-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 40px;
    align-items: start;
  }
  .doc-article {
    min-width: 0;
    max-width: 78ch;
  }
  .doc-header {
    display: grid;
    gap: 14px;
    padding-bottom: 22px;
    margin-bottom: 26px;
    border-bottom: 1px solid var(--line);
  }
  .doc-header h1 {
    font-size: clamp(28px, 3.4vw, 38px);
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
  }
  .doc-eyebrow {
    display: flex;
    gap: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .doc-eyebrow a {
    color: inherit;
    text-decoration: none;
  }
  .doc-eyebrow a:hover {
    color: var(--ink);
  }
  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 28px;
    margin: 0;
    font-size: 13px;
  }
  .doc-meta div {
    display: grid;
    gap: 2px;
  }
  .doc-meta dt {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .doc-meta dd {
    margin: 0;
  }
  .doc-visibility {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .doc-visibility.public {
    color: #2f7d4a;
  }
  .doc-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .doc-pending {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 4px;
    color: var(--accent);
    font-size: 12px;
  }
  .doc-content {
    font-size: 15px;
    line-height: 1.7;
  }
  .doc-content :global(.markdown h1) {
    font-size: 28px;
  }
  .doc-content :global(.markdown h2) {
    font-size: 23px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
  }
  .doc-content :global(.markdown h3) {
    font-size: 18px;
  }
  .doc-content :global(.markdown h4) {
    font-size: 15px;
    font-family: var(--display);
  }
  .doc-content :global(.markdown :is(h1, h2, h3, h4)) {
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  .doc-contributors {
    margin-top: 48px;
    padding-top: 22px;
    border-top: 1px solid var(--line);
  }
  .doc-contributors h2 {
    margin-bottom: 14px;
    font-size: 16px;
  }
  .doc-contributors ul {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .doc-contributors li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 13px;
  }
  .doc-contribution {
    display: flex;
    gap: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }
  .added {
    color: #2f7d4a;
  }
  .removed {
    color: var(--danger);
  }
  .doc-toc {
    position: sticky;
    top: 24px;
  }
  .doc-outline {
    display: none;
    margin-bottom: 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    font-size: 13px;
  }
  .doc-outline summary {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
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
    padding: 0 14px 12px;
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
