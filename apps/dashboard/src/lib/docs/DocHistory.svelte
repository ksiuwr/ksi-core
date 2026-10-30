<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import DocPerson from './DocPerson.svelte';
  import { ArrowLeft, Globe, GitPullRequestArrow, History, ChevronUp, X } from '@lucide/svelte';
  import { formatDateTime } from 'shared/format';
  import { docsPath } from 'shared/docs';
  import { contentLocale, contentLocaleName, type ContentLocale } from 'shared/content-locales';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences } from '$lib/preferences.svelte';
  import Skeleton from '$lib/Skeleton.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import {
    docsRequest,
    errorCode,
    languagesOf,
    textIn,
    type DocDetail,
    type DocRevision,
    type DocSnapshot
  } from './docs';

  type Snapshot = DocSnapshot & { previous: DocSnapshot | null };
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
  const uid = $props.id();
  let trigger = $state<HTMLButtonElement>();
  let picker = $state<HTMLDivElement>();
  let open = $state(false);
  let mode = $state<'preview' | 'changes'>('preview');
  let chosenLocale = $state<ContentLocale | null>(untrack(() => page.locale));
  let loading = $state(true);
  let error = $state('');
  let request = 0;
  const language = $derived(preferences.language);
  const locales = $derived(languagesOf(snapshot, snapshot?.previous));
  const locale = $derived(
    chosenLocale && locales.includes(chosenLocale)
      ? chosenLocale
      : locales.includes(contentLocale(language))
        ? contentLocale(language)
        : 'en'
  );
  const after = $derived(textIn(snapshot, locale));
  const before = $derived(textIn(snapshot?.previous, locale));

  async function select(next: number) {
    const current = ++request;
    selected = next;
    snapshot = null;
    loading = true;
    error = '';
    try {
      const result = await docsRequest<Snapshot>(`/docs/${page.id}/revisions/${next}`);
      if (current === request) snapshot = result;
    } catch (cause) {
      if (current === request) error = errorCode(cause);
    } finally {
      if (current === request) loading = false;
    }
  }

  onMount(() => {
    const initial = revisions.find((revision) => revision.version === version) ?? revisions[0];
    if (initial) void select(initial.version);
    else loading = false;
    return () => {
      request++;
    };
  });

  const when = (value: string) =>
    formatDateTime(value, language, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="workspace-header">
  <div>
    <p class="history-eyebrow">{'Version history'}</p>
    <h1>{page.displayTitle}</h1>
  </div>
  <a class="btn btn-outline" href={docsPath(slug, page.slug)}
    ><ArrowLeft size={15} aria-hidden="true" />{'Back to page'}</a
  >
</div>
<DocError code={error} />
<button
  bind:this={trigger}
  type="button"
  class="btn btn-outline history-trigger"
  popovertarget={`${uid}-versions`}
  aria-expanded={open}
  aria-controls={`${uid}-versions`}
>
  <History size={16} aria-hidden="true" />{'Versions'}
  {#if selected !== null}<span class="history-version">v{selected}</span>{/if}
  <ChevronUp size={14} aria-hidden="true" />
</button>
<div
  bind:this={picker}
  id={`${uid}-versions`}
  class="history-picker"
  popover="auto"
  role="dialog"
  aria-labelledby={`${uid}-versions-title`}
  ontoggle={(event) => (open = event.newState === 'open')}
>
  <header class="history-picker-head">
    <h2 id={`${uid}-versions-title`}>{'Version history'}</h2>
    <button
      type="button"
      class="btn ghost icon-btn btn-sm"
      popovertarget={`${uid}-versions`}
      popovertargetaction="hide"
      aria-label={'Close'}><X size={16} aria-hidden="true" /></button
    >
  </header>
  <ol class="history-list" aria-label={'Versions'}>
    {#each revisions as revision (revision.id)}
      <li>
        <a
          class="history-item"
          class:active={selected === revision.version}
          aria-current={selected === revision.version ? 'true' : undefined}
          href={docsPath(slug, page.slug, 'history', String(revision.version))}
          onclick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            picker?.hidePopover();
            trigger?.focus();
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
</div>
<div class="history">
  <section class="history-detail" aria-live="polite">
    {#if loading}
      <Skeleton label={'Loading version'} />
    {:else if snapshot}
      <div class="history-detail-head">
        <h2>
          {'Version'}
          {snapshot.version}{#if snapshot.public}<span class="history-public"
              ><Globe size={13} aria-hidden="true" />{'Public'}</span
            >{/if}
        </h2>
        <div class="history-controls">
          {#if locales.length > 1}
            <select
              class="history-language"
              value={locale}
              aria-label={'Language'}
              onchange={(event) => (chosenLocale = event.currentTarget.value as ContentLocale)}
            >
              {#each locales as option (option)}
                <option value={option}>{contentLocaleName(option, language)}</option>
              {/each}
            </select>
          {/if}
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
      </div>
      {#if mode === 'changes' && snapshot.previous && before.title !== after.title}
        <p class="history-title-change">
          {'Title'}: <del>{before.title}</del> → <ins>{after.title}</ins>
        </p>
      {/if}
      {#if mode === 'changes' && snapshot.previous && snapshot.previous.folder !== snapshot.folder}
        <p class="history-title-change">
          {'Folder'}: <del>{snapshot.previous.folder || '—'}</del> →
          <ins>{snapshot.folder || '—'}</ins>
        </p>
      {/if}
      {#if mode === 'preview'}
        <div class="history-preview">
          <h1 class="history-preview-title">{after.title || snapshot.title}</h1>
          {#if locale !== 'en' && !after.markdown}
            <p class="history-language-fallback">
              {'This version has no translation in this language. Showing the English text.'}
            </p>
          {/if}
          <MarkdownContent value={after.markdown || snapshot.markdown} docs docLocale={locale} />
        </div>
      {:else}
        <DocDiff
          before={before.markdown}
          after={after.markdown}
          {projectId}
          {locale}
          beforeLabel={snapshot.previous ? `v${snapshot.previous.version}` : '—'}
          afterLabel={`v${snapshot.version}`}
        />
      {/if}
    {:else if error && selected !== null}
      <button
        type="button"
        class="btn btn-outline history-retry"
        onclick={() => selected !== null && select(selected)}>{'Try again'}</button
      >
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
    min-width: 0;
    padding-bottom: 88px;
  }
  .history-trigger {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 30;
    gap: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-md);
  }
  .history-picker {
    position: fixed;
    inset: auto 24px 78px auto;
    width: min(380px, calc(100vw - 32px));
    max-height: calc(100dvh - 112px);
    margin: 0;
    padding: 0;
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-md);
  }
  .history-picker-head {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }
  .history-picker-head h2 {
    margin: 0;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
  }
  .history-list {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 8px;
    list-style: none;
  }
  .history-item {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    color: var(--ink);
    font-size: 13px;
    text-decoration: none;
  }
  .history-item:hover {
    background: var(--surface-muted);
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
    width: 100%;
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
  .history-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .history-language {
    width: auto;
    min-height: 32px;
    padding-block: 4px;
    font-size: 13px;
  }
  .history-retry {
    justify-self: start;
  }
  .history-language-fallback {
    margin-bottom: 16px;
    color: var(--muted);
    font-size: 13px;
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
    padding-block: 24px;
    border-top: 1px solid var(--line);
    line-height: 1.75;
  }
  .history-preview-title {
    margin-bottom: 18px;
    font-size: 28px;
  }
  @media (max-width: 600px) {
    .history-trigger {
      right: 16px;
      bottom: 16px;
    }
    .history-picker {
      right: 16px;
      bottom: 70px;
    }
  }
</style>
