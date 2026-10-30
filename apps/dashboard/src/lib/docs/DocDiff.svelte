<script lang="ts">
  import { contentLocale, type ContentLocale } from 'shared/content-locales';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import { ChevronsUpDown, FileDiff } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import DocError from './DocError.svelte';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { preferences } from '$lib/preferences.svelte';
  import { docsRequest, errorCode, type DiffRow, type DocDiffResult } from './docs';

  let {
    before,
    after,
    projectId,
    beforeLabel,
    afterLabel,
    locale
  }: {
    before: string;
    after: string;
    projectId: string;
    beforeLabel: string;
    afterLabel: string;
    locale?: ContentLocale;
  } = $props();

  const language = $derived(preferences.language);
  let mode = $state<'rendered' | 'source'>('rendered');
  let result = $state<DocDiffResult | null>(null);
  let error = $state('');
  let loading = $state(true);
  const expanded = new SvelteSet<number>();

  $effect(() => {
    const body = {
      before,
      after,
      locale: locale ?? contentLocale(language),
      ...(projectId ? { projectId } : {})
    };
    let cancelled = false;
    loading = true;
    error = '';
    expanded.clear();
    docsRequest<DocDiffResult>('/docs/diff', 'POST', body)
      .then((diff) => {
        if (!cancelled) result = diff;
      })
      .catch((cause) => {
        if (!cancelled) error = errorCode(cause);
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => (cancelled = true);
  });

  type Item =
    | { type: 'row'; key: number; row: DiffRow }
    | { type: 'fold'; key: number; count: number };
  /** Long unchanged stretches fold away, keeping one block of context next to each change. */
  const items = $derived.by(() => {
    const rows = result?.rows ?? [];
    const output: Item[] = [];
    for (let start = 0; start < rows.length; ) {
      if (rows[start]!.kind !== 'same') {
        output.push({ type: 'row', key: start, row: rows[start]! });
        start++;
        continue;
      }
      let end = start;
      while (end < rows.length && rows[end]!.kind === 'same') end++;
      const lead = start === 0 ? 0 : 1;
      const trail = end === rows.length ? 0 : 1;
      const hidden = end - start - lead - trail;
      for (let index = start; index < end; index++) {
        const folded =
          hidden >= 2 && !expanded.has(start) && index >= start + lead && index < end - trail;
        if (!folded) output.push({ type: 'row', key: index, row: rows[index]! });
        else if (index === start + lead) output.push({ type: 'fold', key: start, count: hidden });
      }
      start = end;
    }
    return output;
  });
  const changed = $derived(result?.rows.some((row) => row.kind !== 'same') ?? false);
</script>

<section class="doc-diff" aria-busy={loading}>
  <div class="doc-diff-toolbar">
    <span class="doc-diff-stats">
      <FileDiff size={15} aria-hidden="true" />
      {#if result}
        {'Changed lines'}:
        <span class="added-count">+{result.additions}</span>
        <span class="removed-count">−{result.deletions}</span>
      {/if}
    </span>
    <div class="segmented-control" role="group" aria-label={'Comparison view'} use:slider>
      <button
        type="button"
        class:active={mode === 'rendered'}
        aria-pressed={mode === 'rendered'}
        onclick={() => (mode = 'rendered')}>{'Rendered'}</button
      >
      <button
        type="button"
        class:active={mode === 'source'}
        aria-pressed={mode === 'source'}
        onclick={() => (mode = 'source')}>{'Markdown'}</button
      >
    </div>
  </div>
  <DocError code={error} />
  {#if loading && !result}
    <div class="doc-diff-loading"><span></span><span></span><span></span></div>
  {:else if result && !changed}
    <p class="muted doc-diff-empty">{'The content is the same in both versions.'}</p>
  {:else if result}
    {#if mode === 'rendered'}
      <div class="doc-diff-head" aria-hidden="true">
        <span>{beforeLabel}</span><span>{afterLabel}</span>
      </div>
    {/if}
    <div class={['doc-diff-rows', mode]}>
      {#each items as item (item.type === 'fold' ? `fold-${item.key}` : item.key)}
        {#if item.type === 'fold'}
          <button type="button" class="doc-diff-fold" onclick={() => expanded.add(item.key)}>
            <ChevronsUpDown size={14} aria-hidden="true" />
            {'Show unchanged sections'} ({item.count})
          </button>
        {:else if mode === 'rendered'}
          <div class={['doc-diff-row', item.row.kind]}>
            <div class="doc-diff-cell before" data-label={beforeLabel}>
              {#if item.row.before}<Markdown blocks={item.row.before} {language} />{/if}
            </div>
            <div class="doc-diff-cell after" data-label={afterLabel}>
              {#if item.row.kind === 'same' && item.row.before}<Markdown
                  blocks={item.row.before}
                  {language}
                />{:else if item.row.after}<Markdown blocks={item.row.after} {language} />{/if}
            </div>
          </div>
        {:else if item.row.kind === 'changed' && item.row.words}
          <pre class="doc-diff-source removed"><span class="sign" aria-hidden="true">−</span><code
              >{#each item.row.words.before as part, index (index)}{#if part.changed}<del
                    >{part.text}</del
                  >{:else}{part.text}{/if}{/each}</code
            ></pre>
          <pre class="doc-diff-source added"><span class="sign" aria-hidden="true">+</span><code
              >{#each item.row.words.after as part, index (index)}{#if part.changed}<ins
                    >{part.text}</ins
                  >{:else}{part.text}{/if}{/each}</code
            ></pre>
        {:else}
          <pre class={['doc-diff-source', item.row.kind]}><span class="sign" aria-hidden="true"
              >{#if item.row.kind === 'added'}+{:else if item.row.kind === 'removed'}−{/if}</span
            ><code>{item.row.afterSource ?? item.row.beforeSource}</code></pre>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .doc-diff {
    display: grid;
    gap: 12px;
    min-width: 0;
  }
  .doc-diff-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .doc-diff-stats {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
  }
  .added-count {
    color: var(--positive);
  }
  .removed-count {
    color: var(--danger);
  }
  .doc-diff-head {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .doc-diff-rows {
    display: grid;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow-xs);
  }
  .doc-diff-rows.source {
    gap: 0;
  }
  .doc-diff-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--line);
  }
  .doc-diff-row:first-child {
    border-top: 0;
  }
  .doc-diff-cell {
    min-width: 0;
    padding: 12px 16px;
  }
  .doc-diff-cell.before {
    border-right: 1px solid var(--line);
  }
  .doc-diff-cell :global(.markdown :is(h1, h2, h3, h4, h5, h6)) {
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  .doc-diff-cell :global(.markdown h1) {
    font-size: 22px;
  }
  .doc-diff-cell :global(.markdown h2) {
    font-size: 19px;
  }
  .doc-diff-cell :global(.markdown h3) {
    font-size: 16px;
  }
  .doc-diff-cell :global(.markdown :is(h4, h5, h6)) {
    font-size: 14px;
  }
  .doc-diff-row.same .doc-diff-cell {
    opacity: 0.62;
  }
  .doc-diff-row:is(.removed, .changed) .before {
    background: color-mix(in srgb, var(--danger) 9%, transparent);
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--danger) 70%, transparent);
  }
  .doc-diff-row:is(.added, .changed) .after {
    background: color-mix(in srgb, var(--positive) 10%, transparent);
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--positive) 75%, transparent);
  }
  .doc-diff-row.added .before,
  .doc-diff-row.removed .after {
    background: repeating-linear-gradient(
      -45deg,
      transparent 0 6px,
      color-mix(in srgb, var(--line) 45%, transparent) 6px 7px
    );
  }
  .doc-diff-fold {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 7px;
    border: 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 12px;
    cursor: pointer;
  }
  .doc-diff-fold:first-child {
    border-top: 0;
  }
  .doc-diff-fold:hover {
    color: var(--ink);
  }
  .doc-diff-source {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    margin: 0;
    padding: 6px 12px 6px 0;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: transparent;
  }
  .doc-diff-source code {
    font: inherit;
  }
  .doc-diff-source .sign {
    text-align: center;
    color: var(--muted);
    user-select: none;
  }
  .doc-diff-source.same {
    color: var(--muted);
  }
  .doc-diff-source.removed {
    background: color-mix(in srgb, var(--danger) 9%, transparent);
  }
  .doc-diff-source.added {
    background: color-mix(in srgb, var(--positive) 10%, transparent);
  }
  .doc-diff-source del {
    background: color-mix(in srgb, var(--danger) 28%, transparent);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--danger) 70%, transparent);
  }
  .doc-diff-source ins {
    background: color-mix(in srgb, var(--positive) 30%, transparent);
    text-decoration: none;
  }
  .doc-diff-empty {
    padding: 16px;
    border: 1px dashed var(--line);
    border-radius: var(--radius-xl);
  }
  .doc-diff-loading {
    display: grid;
    gap: 10px;
  }
  .doc-diff-loading span {
    height: 14px;
    border-radius: var(--radius-sm);
    background: var(--surface-muted);
  }
  .doc-diff-loading span:last-child {
    width: 60%;
  }
  @media (max-width: 760px) {
    .doc-diff-head {
      display: none;
    }
    .doc-diff-row {
      grid-template-columns: minmax(0, 1fr);
    }
    .doc-diff-cell.before {
      border-right: 0;
    }
    .doc-diff-row.same .after,
    .doc-diff-row.added .before,
    .doc-diff-row.removed .after {
      display: none;
    }
    .doc-diff-row.changed .doc-diff-cell::before {
      content: attr(data-label);
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
    }
  }
</style>
