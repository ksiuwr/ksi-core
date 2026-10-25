<script lang="ts">
  import Markdown from './Markdown.svelte';
  import type { MarkdownBlock } from 'shared/markdown';
  let {
    value,
    language = 'pl',
    allowReferences = false,
    onresize
  }: {
    value: string;
    language?: 'pl' | 'en';
    allowReferences?: boolean;
    onresize?: (index: number, width: number) => void;
  } = $props();
  let blocks = $state<MarkdownBlock[]>([]);
  let loading = $state(true);
  let failed = $state(false);
  $effect(() => {
    const markdown = value;
    const references = allowReferences;
    const controller = new AbortController();
    loading = true;
    failed = false;
    fetch('/api/markdown', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        markdown,
        ...(references
          ? {
              referenceScope: decodeURIComponent(
                window.location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? '~association'
              )
            }
          : {})
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Preview unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) blocks = result;
      })
      .catch(() => {
        if (!controller.signal.aborted) failed = true;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
</script>

{#if loading && blocks.length === 0}<div
    class="markdown-skeleton"
    aria-label={language === 'pl' ? 'Ładowanie podglądu' : 'Loading preview'}
  >
    <span></span><span></span><span></span>
  </div>
{:else if failed}<p role="alert">
    {language === 'pl'
      ? 'Podgląd niedostępny. Spróbuj ponownie.'
      : 'Preview unavailable. Please try again.'}
  </p>
{:else if !value.trim()}<p class="muted">{language === 'pl' ? 'Brak opisu.' : 'No description.'}</p>
{:else}<Markdown {blocks} {language} {onresize} />{/if}

<style>
  .markdown-skeleton {
    display: grid;
    gap: 10px;
    padding: 8px 0;
  }
  .markdown-skeleton span {
    height: 12px;
    background: var(--surface-muted);
    border-radius: 3px;
  }
  .markdown-skeleton span:last-child {
    width: 65%;
  }
</style>
