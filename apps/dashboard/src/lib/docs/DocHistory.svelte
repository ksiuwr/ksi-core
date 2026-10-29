<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import DocPerson from './DocPerson.svelte';
  import { ArrowLeft, Globe, GitPullRequestArrow } from '@lucide/svelte';
  import { formatDateTime } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import type { MarkdownBlock } from 'shared/markdown';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences } from '$lib/preferences.svelte';
  import Skeleton from '$lib/Skeleton.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import { docsRequest, errorCode, type DocDetail, type DocRevision } from './docs';

  type Snapshot = {
    version: number;
    title: string;
    markdown: string;
    public: boolean;
    blocks: MarkdownBlock[];
    previous: { version: number; title: string; markdown: string; public: boolean } | null;
  };
  let {
    projectId,
    slug,
    page,
    revisions,
    version
  }: {
    projectId: string;
    slug: string | null;
    page: DocDetail;
    revisions: DocRevision[];
    version: number | null;
  } = $props();

  let selected = $state<number | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  let mode = $state<'preview' | 'changes'>('changes');
  let error = $state('');
  let request = 0;
  const language = $derived(preferences.language);

  async function select(next: number) {
    const current = ++request;
    selected = next;
    snapshot = null;
    try {
      const result = await docsRequest<Snapshot>(`/docs/${page.id}/revisions/${next}`);
      if (current === request) snapshot = result;
    } catch (cause) {
      if (current === request) error = errorCode(cause);
    }
  }

  onMount(() => {
    const initial = revisions.find((revision) => revision.version === version) ?? revisions[0];
    if (initial) void select(initial.version);
  });

  const when = (value: string) =>
    formatDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="workspace-header">
  <div>
    <p class="history-eyebrow">{'Version history'}</p>
    <h1>{page.title}</h1>
  </div>
  <a class="btn btn-outline" href={docsPath(slug, page.slug)}
    ><ArrowLeft size={15} aria-hidden="true" />{'Back to page'}</a
  >
</div>
<DocError code={error} />
<div class="history">
  <ol class="history-list" aria-label={'Versions'}>
    {#each revisions as revision (revision.id)}
      <li>
        <a
          class="history-item"
          class:active={selected === revision.version}
          aria-current={selected === revision.version ? 'true' : undefined}
          href={docsPath(slug, page.slug, 'history', String(revision.version))}
          onclick={(event) => {
            event.preventDefault();
            replaceState(event.currentTarget.href, {});
            void select(revision.version);
          }}
        >
          <span class="history-item-head">
            <span class="history-version">v{revision.version}</span>
            <time datetime={revision.createdAt}>{when(revision.createdAt)}</time>
            {#if revision.version === page.version}<span class="tag tag-mint">{'Current'}</span
              >{/if}
          </span>
          <span class="history-reason">
            {#if revision.reason}{revision.reason}{:else}<span class="muted">{'No summary'}</span
              >{/if}
          </span>
          <span class="history-item-meta">
            {#if revision.author}
              <DocPerson person={revision.author} />
            {/if}
            <span class="history-lines"
              ><span class="added">+{revision.additions}</span>
              <span class="removed">−{revision.deletions}</span></span
            >
          </span>
          {#if revision.reviewer}
            <span class="history-review"
              ><GitPullRequestArrow size={12} aria-hidden="true" />{'Suggestion accepted by'}
              {revision.reviewer.name}</span
            >
          {/if}
        </a>
      </li>
    {/each}
  </ol>
  <section class="history-detail" aria-live="polite">
    {#if !snapshot}
      <Skeleton label={'Loading version'} />
    {:else}
      <div class="history-detail-head">
        <h2>
          {'Version'}
          {snapshot.version}{#if snapshot.public}<span class="history-public"
              ><Globe size={13} aria-hidden="true" />{'Public'}</span
            >{/if}
        </h2>
        <div class="segmented-control" role="group" aria-label={'Version view'} use:slider>
          <button
            type="button"
            class:active={mode === 'changes'}
            aria-pressed={mode === 'changes'}
            onclick={() => (mode = 'changes')}>{'Changes'}</button
          >
          <button
            type="button"
            class:active={mode === 'preview'}
            aria-pressed={mode === 'preview'}
            onclick={() => (mode = 'preview')}>{'Full page'}</button
          >
        </div>
      </div>
      {#if snapshot.previous && snapshot.previous.title !== snapshot.title}
        <p class="history-title-change">
          {'Title'}: <del>{snapshot.previous.title}</del> → <ins>{snapshot.title}</ins>
        </p>
      {/if}
      {#if mode === 'preview'}
        <div class="history-preview">
          <h1 class="history-preview-title">{snapshot.title}</h1>
          <Markdown blocks={snapshot.blocks} {language} />
        </div>
      {:else}
        <DocDiff
          before={snapshot.previous?.markdown ?? ''}
          after={snapshot.markdown}
          {projectId}
          beforeLabel={snapshot.previous ? `v${snapshot.previous.version}` : '—'}
          afterLabel={`v${snapshot.version}`}
        />
      {/if}
    {/if}
  </section>
</div>

<style>
  .history-eyebrow {
    margin-bottom: 8px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .history {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }
  .history-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
  .history-item {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    text-decoration: none;
    box-shadow: var(--shadow-xs);
  }
  .history-item:hover {
    border-color: var(--control-border-hover);
  }
  .history-item.active {
    border-color: var(--accent);
    box-shadow: inset 3px 0 0 var(--accent);
  }
  .history-item-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 11px;
  }
  .history-version {
    color: var(--ink);
    font-family: var(--mono);
    font-weight: 700;
  }
  .history-reason {
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .history-item-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }
  .history-lines {
    font-family: var(--mono);
    font-size: 11px;
  }
  .added {
    color: #2f7d4a;
  }
  .removed {
    color: var(--danger);
  }
  .history-review {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 11px;
  }
  .history-detail {
    display: grid;
    gap: 16px;
    min-width: 0;
  }
  .history-detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .history-detail-head h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
  }
  .history-public {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #2f7d4a;
    font-family: var(--font);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0;
  }
  .history-title-change {
    margin: 0;
    font-size: 13px;
  }
  .history-title-change del {
    color: var(--danger);
  }
  .history-title-change ins {
    color: #2f7d4a;
    text-decoration: none;
  }
  .history-preview {
    padding: 24px 28px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    line-height: 1.7;
    box-shadow: var(--shadow-xs);
  }
  .history-preview-title {
    margin-bottom: 18px;
    font-size: 28px;
  }
  @media (max-width: 900px) {
    .history {
      grid-template-columns: minmax(0, 1fr);
    }
    .history-list {
      position: static;
      max-height: 320px;
    }
  }
</style>
