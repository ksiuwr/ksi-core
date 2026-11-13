<script lang="ts">
  import { contentLocale, type ContentLocale } from 'shared/content-locales';
  import Markdown from '@ksi-core/ui/platform/Markdown.svelte';
  import { ChevronsUpDown, FileDiff } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import DocError from './DocError.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { docsRequest, errorCode, type DiffRow, type DocDiffResult } from './docs';
  import {
    Button,
    Card,
    Grid,
    HStack,
    Icon,
    SegmentedControl,
    SegmentedControlItem,
    Skeleton,
    Text,
    VStack
  } from '@astryx-sv/core';

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

<VStack as="section" gap={3} class="doc-diff" aria-busy={loading}>
  <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
    <HStack gap={1.5} vAlign="center">
      <Icon icon={FileDiff} size="sm" color="secondary" />
      {#if result}
        <Text type="supporting" class="doc-diff-mono">Zmienione wiersze:</Text>
        <Text type="supporting" class="doc-diff-mono added-count">+{result.additions}</Text>
        <Text type="supporting" class="doc-diff-mono removed-count">−{result.deletions}</Text>
      {/if}
    </HStack>
    <SegmentedControl
      value={mode}
      onChange={(next) => (mode = next as 'rendered' | 'source')}
      label={'Widok porównania'}
      size="sm"
    >
      <SegmentedControlItem value="rendered" label="Wyrenderowany" />
      <SegmentedControlItem value="source" label="Markdown" />
    </SegmentedControl>
  </HStack>
  <DocError code={error} />
  {#if loading && !result}
    <VStack gap={2}>
      <Skeleton height={14} />
      <Skeleton height={14} />
      <Skeleton height={14} width="60%" />
    </VStack>
  {:else if result && !changed}
    <Text as="p" type="supporting" class="doc-diff-empty">
      Treść jest taka sama w obu wersjach.
    </Text>
  {:else if result}
    {#if mode === 'rendered'}
      <Grid columns={2} gap={3} class="doc-diff-head" aria-hidden="true">
        <Text type="supporting" class="doc-diff-mono">{beforeLabel}</Text>
        <Text type="supporting" class="doc-diff-mono">{afterLabel}</Text>
      </Grid>
    {/if}
    <Card padding={0} class={`doc-diff-rows ${mode}`}>
      {#each items as item (item.type === 'fold' ? `fold-${item.key}` : item.key)}
        {#if item.type === 'fold'}
          <Button
            label={`Pokaż niezmienione fragmenty (${item.count})`}
            variant="ghost"
            size="sm"
            width="100%"
            class="doc-diff-fold"
            onclick={() => expanded.add(item.key)}
          >
            {#snippet icon()}<Icon icon={ChevronsUpDown} size="sm" />{/snippet}
          </Button>
        {:else if mode === 'rendered'}
          <Grid columns={2} class={`doc-diff-row ${item.row.kind}`}>
            <VStack gap={0} class="doc-diff-cell before" data-label={beforeLabel}>
              {#if item.row.before}<Markdown blocks={item.row.before} {language} />{/if}
            </VStack>
            <VStack gap={0} class="doc-diff-cell after" data-label={afterLabel}>
              {#if item.row.kind === 'same' && item.row.before}<Markdown
                  blocks={item.row.before}
                  {language}
                />{:else if item.row.after}<Markdown blocks={item.row.after} {language} />{/if}
            </VStack>
          </Grid>
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
          <pre class={`doc-diff-source ${item.row.kind}`}><span class="sign" aria-hidden="true"
              >{#if item.row.kind === 'added'}+{:else if item.row.kind === 'removed'}−{/if}</span
            ><code>{item.row.afterSource ?? item.row.beforeSource}</code></pre>
        {/if}
      {/each}
    </Card>
  {/if}
</VStack>

<style>
  :global(.doc-diff) {
    min-width: 0;
  }
  :global(.doc-diff-mono) {
    font-family: var(--font-family-code);
  }
  :global(.doc-diff-head) {
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  :global(.doc-diff .added-count) {
    color: var(--color-text-green);
  }
  :global(.doc-diff .removed-count) {
    color: var(--color-text-red);
  }
  :global(.doc-diff-rows) {
    overflow: hidden;
  }
  :global(.doc-diff-row) {
    border-top: 1px solid var(--color-border);
  }
  :global(.doc-diff-rows > .doc-diff-row:first-child) {
    border-top: 0;
  }
  :global(.doc-diff-cell) {
    min-width: 0;
    padding: var(--spacing-3) var(--spacing-4);
  }
  :global(.doc-diff-cell.before) {
    border-right: 1px solid var(--color-border);
  }
  :global(.doc-diff-rows.source),
  :global(.doc-diff-rows.source .doc-diff-row) {
    display: block !important;
  }
  :global(.doc-diff-cell .markdown :is(h1, h2, h3, h4, h5, h6)) {
    line-height: 1.3;
    letter-spacing: -0.02em;
  }
  :global(.doc-diff-cell .markdown h1) {
    font-size: var(--font-size-xl);
  }
  :global(.doc-diff-cell .markdown h2) {
    font-size: var(--font-size-lg);
  }
  :global(.doc-diff-cell .markdown h3) {
    font-size: var(--font-size-lg);
  }
  :global(.doc-diff-cell .markdown :is(h4, h5, h6)) {
    font-size: var(--font-size-base);
  }
  :global(.doc-diff-row.same .doc-diff-cell) {
    opacity: 0.62;
  }
  :global(.doc-diff-row:is(.removed, .changed) .before) {
    background: color-mix(in srgb, var(--color-error) 9%, transparent);
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--color-error) 70%, transparent);
  }
  :global(.doc-diff-row:is(.added, .changed) .after) {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    box-shadow: inset 3px 0 0 color-mix(in srgb, var(--color-success) 75%, transparent);
  }
  :global(.doc-diff-row.added .before),
  :global(.doc-diff-row.removed .after) {
    background: repeating-linear-gradient(
      -45deg,
      transparent 0 6px,
      color-mix(in srgb, var(--color-border) 45%, transparent) 6px 7px
    );
  }
  :global(.doc-diff-fold) {
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    color: var(--color-text-secondary);
  }
  :global(.doc-diff-rows > .doc-diff-fold:first-child) {
    border-top: 0;
  }
  .doc-diff-source {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    margin: 0;
    padding: 6px 12px 6px 0;
    font-family: var(--font-family-code);
    font-size: var(--font-size-sm);
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
    color: var(--color-text-secondary);
    user-select: none;
  }
  .doc-diff-source.same {
    color: var(--color-text-secondary);
  }
  .doc-diff-source.removed {
    background: color-mix(in srgb, var(--color-error) 9%, transparent);
  }
  .doc-diff-source.added {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
  }
  .doc-diff-source del {
    background: color-mix(in srgb, var(--color-error) 28%, transparent);
    text-decoration: line-through;
    text-decoration-color: color-mix(in srgb, var(--color-error) 70%, transparent);
  }
  .doc-diff-source ins {
    background: color-mix(in srgb, var(--color-success) 30%, transparent);
    text-decoration: none;
  }
  :global(.doc-diff-empty) {
    padding: var(--spacing-4);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-container);
  }
  @media (max-width: 760px) {
    :global(.doc-diff-head) {
      display: none;
    }
    :global(.doc-diff-row) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    :global(.doc-diff-cell.before) {
      border-right: 0;
    }
    :global(.doc-diff-row.same .after),
    :global(.doc-diff-row.added .before),
    :global(.doc-diff-row.removed .after) {
      display: none;
    }
    :global(.doc-diff-row.changed .doc-diff-cell::before) {
      content: attr(data-label);
      display: block;
      margin-bottom: 6px;
      color: var(--color-text-secondary);
      font-family: var(--font-family-code);
      font-size: var(--font-size-xs);
      text-transform: uppercase;
    }
  }
</style>
