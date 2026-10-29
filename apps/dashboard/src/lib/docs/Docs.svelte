<script lang="ts">
  import { onMount } from 'svelte';
  import DocPerson from './DocPerson.svelte';
  import {
    BookOpen,
    FileText,
    Globe,
    GitPullRequestArrow,
    UsersRound,
    Plus,
    ChevronDown,
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
  const home = $derived(docsPath(slug));
  const view = $derived(data.view);
  const index = $derived(data.index);
  const first = $derived(data.path[0]);
  let wide = $state(true);
  let navigationOpen = $state(false);

  onMount(() => {
    const media = window.matchMedia('(min-width: 1400px)');
    const sync = () => (wide = media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  });

  const updated = (value: string) =>
    formatDate(value, language, { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="docs-layout">
  <details
    class="docs-navigation"
    open={wide || navigationOpen}
    ontoggle={(event) => {
      if (!wide) navigationOpen = event.currentTarget.open;
    }}
  >
    <summary
      ><BookOpen size={16} aria-hidden="true" />{'Documentation pages'}<ChevronDown
        size={16}
        aria-hidden="true"
      /></summary
    >
    <nav aria-label={'Documentation'}>
      <a class="docs-nav-link" class:active={view === 'index'} href={home}
        ><BookOpen size={15} aria-hidden="true" />{'Overview'}</a
      >
      <p class="docs-nav-label">{'Pages'}</p>
      {#each index.pages as page (page.id)}
        <a
          class="docs-nav-link"
          class:active={first === page.slug}
          aria-current={first === page.slug && view === 'page' ? 'page' : undefined}
          href={docsPath(slug, page.slug)}
          ><FileText size={15} aria-hidden="true" /><span>{page.title}</span>{#if page.public}<Globe
              size={13}
              class="docs-nav-public"
              aria-label={'Public'}
            />{/if}</a
        >
      {:else}
        <p class="docs-nav-empty">{'No pages yet.'}</p>
      {/each}
      <!-- Collaboration tools stay below the pages, quieter than the reading links. -->
      <div class="docs-nav-tools">
        <a
          class="docs-nav-link minor"
          class:active={view === 'suggestions' || view === 'suggestion'}
          href={docsPath(slug, 'suggestions')}
          ><GitPullRequestArrow size={14} aria-hidden="true" /><span>{'Suggestions'}</span
          >{#if index.pendingSuggestions}<span class="docs-nav-count"
              >{index.pendingSuggestions}</span
            >{/if}</a
        >
        <a
          class="docs-nav-link minor"
          class:active={view === 'contributors'}
          href={docsPath(slug, 'contributors')}
          ><UsersRound size={14} aria-hidden="true" />{'Contributors'}</a
        >
        {#if index.access.canPropose}
          <a class="docs-nav-link minor" class:active={view === 'new'} href={docsPath(slug, 'new')}
            ><Plus
              size={14}
              aria-hidden="true"
            />{#if index.access.canReview}{'New page'}{:else}{'Suggest a page'}{/if}</a
          >
        {/if}
      </div>
    </nav>
  </details>

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
            <a class="btn" href={docsPath(slug, 'new')}
              ><Plus
                size={15}
                aria-hidden="true"
              />{#if index.access.canReview}{'New page'}{:else}{'Suggest a page'}{/if}</a
            >
          {/if}
        </div>
        {#if index.access.canReview && index.pendingSuggestions}
          <a class="docs-callout" href={docsPath(slug, 'suggestions')}>
            <GitPullRequestArrow size={18} aria-hidden="true" />
            <span
              >{'Suggestions waiting for your review'}:
              <strong>{index.pendingSuggestions}</strong></span
            >
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        {/if}
        {#if index.pages.length}
          <div class="docs-cards">
            {#each index.pages as page (page.id)}
              <a class="docs-card" href={docsPath(slug, page.slug)}>
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
        <DocEditor {projectId} {slug} page={data.page} access={index.access} {workspaceName} />
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
    display: grid;
    grid-template-columns: 210px minmax(0, 1fr);
    gap: 36px;
    align-items: start;
  }
  .docs-navigation {
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .docs-navigation summary {
    display: none;
  }
  nav {
    display: grid;
    gap: 2px;
  }
  .docs-nav-label {
    margin: 18px 10px 6px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
  .docs-nav-link :global(.docs-nav-public) {
    color: var(--muted);
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
  .docs-nav-empty {
    margin: 0;
    padding: 6px 10px;
    color: var(--muted);
    font-size: 12px;
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
  @media (max-width: 1399px) {
    .docs-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }
    .docs-navigation {
      position: static;
      max-height: none;
      border: 1px solid var(--line);
      border-radius: var(--radius-xl);
      background: var(--surface);
    }
    .docs-navigation summary {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      font-size: 13px;
      cursor: pointer;
      list-style: none;
    }
    .docs-navigation summary::-webkit-details-marker {
      display: none;
    }
    .docs-navigation summary :global(svg:last-child) {
      margin-left: auto;
      transition: transform 150ms ease;
    }
    .docs-navigation[open] summary :global(svg:last-child) {
      transform: rotate(180deg);
    }
    nav {
      padding: 0 8px 12px;
    }
  }
</style>
