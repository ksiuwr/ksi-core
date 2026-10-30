<script lang="ts">
  import DocPerson from './DocPerson.svelte';
  import {
    BookOpen,
    FileText,
    GitPullRequestArrow,
    UsersRound,
    Plus,
    Folder,
    ArrowRight
  } from '@lucide/svelte';
  import { formatDate } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { preferences } from '$lib/preferences.svelte';
  import DocPage from './DocPage.svelte';
  import DocEditor from './DocEditor.svelte';
  import DocHistory from './DocHistory.svelte';
  import DocSuggestions from './DocSuggestions.svelte';
  import DocSuggestion from './DocSuggestion.svelte';
  import DocContributors from './DocContributors.svelte';
  import type { DocSummary } from './docs';
  import DocTree from './DocTree.svelte';
  import FloatingDocsNavigation from './FloatingDocsNavigation.svelte';
  import type {
    DocDetail,
    DocIndex,
    DocInsights,
    DocRevision,
    DocsView,
    SuggestionDetail,
    SuggestionSummary
  } from './docs';

  let {
    projectId,
    projectSlug,
    workspaceName,
    data,
    websiteOrigin
  }: {
    /** Empty for the association workspace. */
    projectId: string;
    projectSlug: string;
    workspaceName: string;
    data: {
      view: DocsView;
      path: string[];
      index: DocIndex;
      page: DocDetail | null;
      revisions?: DocRevision[];
      suggestions?: SuggestionSummary[];
      resolved?: boolean;
      suggestion?: SuggestionDetail;
      insights?: DocInsights;
    };
    websiteOrigin: string;
  } = $props();

  const language = $derived(preferences.language);
  const slug = $derived(projectSlug || null);
  const home = $derived(hrefFor());
  const view = $derived(data.view);
  const index = $derived(data.index);
  const first = $derived(data.path[0]);
  // Pages without a folder come first, then one section per folder path.
  const groups = $derived(
    Object.entries(
      Object.groupBy(index.pages, (page) => page.folder) as Record<string, DocSummary[]>
    )
      .map(([folder, pages]) => ({
        folder,
        pages: pages.sort((a, b) => a.title.localeCompare(b.title))
      }))
      .sort((a, b) => (a.folder && b.folder ? a.folder.localeCompare(b.folder) : a.folder ? 1 : -1))
  );
  function hrefFor(...segments: string[]) {
    return docsPath(slug, ...segments);
  }
  const updated = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="docs-layout" class:docs-history={view === 'history'}>
  {#if view !== 'history'}
    <FloatingDocsNavigation label={'Documentation pages'}>
      <nav aria-label={'Documentation'}>
        <a class="docs-nav-link" class:active={view === 'index'} href={home}
          ><BookOpen size={15} aria-hidden="true" />{'Overview'}</a
        >
        <DocTree {index} {projectId} {slug} selected={first} />
        <!-- Collaboration tools stay below the pages, quieter than the reading links. -->
        <div class="docs-nav-tools">
          <a
            class="docs-nav-link minor"
            class:active={view === 'suggestions' || view === 'suggestion'}
            href={hrefFor('suggestions')}
            ><GitPullRequestArrow size={14} aria-hidden="true" /><span>{'Suggestions'}</span
            >{#if index.pendingSuggestions}<span class="docs-nav-count"
                >{index.pendingSuggestions}</span
              >{/if}</a
          >
          <a
            class="docs-nav-link minor"
            class:active={view === 'contributors'}
            href={hrefFor('contributors')}
            ><UsersRound size={14} aria-hidden="true" />{'Contributors'}</a
          >
          {#if index.access.canPropose}
            <a class="docs-nav-link minor" class:active={view === 'new'} href={hrefFor('new')}
              ><Plus
                size={14}
                aria-hidden="true"
              />{#if index.access.canReview}{'New page'}{:else}{'Suggest a page'}{/if}</a
            >
          {/if}
        </div>
      </nav>
    </FloatingDocsNavigation>
  {/if}

  <div class="docs-main">
    <!-- Views keep editor and selection state, so each address starts fresh. -->
    {#key data.path.join('/')}
      {#if view === 'index'}
        <div class="workspace-header">
          <div>
            <p class="docs-eyebrow">{workspaceName}</p>
            <h1>{'Documentation'}</h1>
            <p class="workspace-description">
              {'How this workspace works, written down for everyone who comes next.'}
            </p>
          </div>
          {#if index.access.canPropose}
            <a class="btn" href={hrefFor('new')}
              ><Plus
                size={15}
                aria-hidden="true"
              />{#if index.access.canReview}{'New page'}{:else}{'Suggest a page'}{/if}</a
            >
          {/if}
        </div>
        {#if index.access.canReview && index.pendingSuggestions}
          <a class="docs-callout" href={hrefFor('suggestions')}>
            <GitPullRequestArrow size={18} aria-hidden="true" />
            <span
              >{'Suggestions waiting for your review'}:
              <strong>{index.pendingSuggestions}</strong></span
            >
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        {/if}
        {#if index.pages.length}
          {#each groups as group (group.folder)}
            <section class="docs-group" aria-label={group.folder || undefined}>
              {#if group.folder}
                <h2 class="docs-group-title">
                  <Folder size={15} aria-hidden="true" />{group.folder.split('/').join(' / ')}
                </h2>
              {/if}
              <div class="docs-cards">
                {#each group.pages as page (page.id)}
                  <a class="docs-card" href={hrefFor(page.slug)}>
                    <span class="docs-card-title"
                      ><FileText size={16} aria-hidden="true" />{page.title}{#if page.public}<span
                          class="tag tag-mint">{'Public'}</span
                        >{/if}</span
                    >
                    {#if page.excerpt}<span class="docs-card-excerpt">{page.excerpt}</span>{/if}
                    <span class="docs-card-meta">
                      <span class="docs-card-people">
                        {#each page.contributors.slice(0, 4) as person (person.id)}
                          <DocPerson {person} size={22} showName={false} />
                        {/each}
                      </span>
                      <span
                        >{'Updated'}
                        <time datetime={page.updatedAt}>{updated(page.updatedAt)}</time></span
                      >
                    </span>
                  </a>
                {/each}
              </div>
            </section>
          {/each}
        {:else}
          <div class="empty-state">
            <BookOpen size={28} strokeWidth={1.4} aria-hidden="true" />
            <h2>{'No documentation yet'}</h2>
            <p>
              {'Write down how things work here, so the next team does not have to start from scratch.'}
            </p>
          </div>
        {/if}
      {:else if view === 'page' && data.page}
        <DocPage page={data.page} {slug} {websiteOrigin} />
      {:else if (view === 'edit' && data.page) || view === 'new'}
        <DocEditor
          {projectId}
          {slug}
          page={data.page}
          access={index.access}
          folders={index.folders}
          {workspaceName}
        />
      {:else if view === 'history' && data.page}
        <DocHistory
          {projectId}
          {slug}
          page={data.page}
          revisions={data.revisions ?? []}
          version={data.path[2] ? Number(data.path[2]) : null}
        />
      {:else if view === 'suggestions'}
        <DocSuggestions {slug} suggestions={data.suggestions ?? []} resolved={!!data.resolved} />
      {:else if view === 'suggestion' && data.suggestion}
        <DocSuggestion {projectId} {slug} suggestion={data.suggestion} />
      {:else if view === 'contributors' && data.insights}
        <DocContributors insights={data.insights} {workspaceName} />
      {/if}
    {/key}
  </div>
</div>

<style>
  .docs-layout {
    display: block;
  }
  nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
  .docs-nav-link {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: var(--radius-md);
    color: var(--muted);
    font-size: 13px;
    line-height: 1.35;
    text-decoration: none;
  }
  .docs-nav-link {
    padding-left: calc(10px + var(--depth, 0) * 14px);
  }
  .docs-group + .docs-group {
    margin-top: 28px;
  }
  .docs-group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    color: var(--muted);
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0;
  }
  .docs-nav-link span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .docs-nav-link :global(svg) {
    flex-shrink: 0;
  }
  .docs-nav-link:hover {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .docs-nav-link.active {
    color: var(--ink);
    background: var(--surface-muted);
  }
  .docs-nav-link.active :global(svg:first-child) {
    color: var(--accent);
  }
  .docs-nav-count {
    flex: 0 0 auto !important;
    min-width: 20px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: var(--primary-text);
    font-family: var(--mono);
    font-size: 10px;
    text-align: center;
  }
  .docs-nav-tools {
    display: grid;
    gap: 1px;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
  .docs-nav-link.minor {
    padding-block: 5px;
    font-size: 12px;
  }
  .docs-main {
    min-width: 0;
  }
  .docs-eyebrow {
    margin-bottom: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .docs-callout {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    text-decoration: none;
    box-shadow: var(--shadow-xs);
  }
  .docs-callout span {
    flex: 1;
  }
  .docs-callout:hover {
    border-color: var(--control-border-hover);
  }
  .docs-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 14px;
  }
  .docs-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
    box-shadow: var(--shadow-xs);
  }
  .docs-card:hover {
    border-color: var(--control-border-hover);
    outline: 1px solid var(--control-border-hover);
    outline-offset: 2px;
  }
  .docs-card-title {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    font-family: var(--display);
    font-size: 17px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .docs-card-title :global(svg) {
    color: var(--accent);
  }
  .docs-card-excerpt {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.55;
  }
  .docs-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    color: var(--muted);
    font-size: 12px;
  }
  .docs-card-people {
    display: flex;
  }
  .docs-card-people :global(.doc-person + .doc-person) {
    margin-left: -6px;
  }
</style>
