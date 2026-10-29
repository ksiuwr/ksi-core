<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import Markdown from './Markdown.svelte';
  import { preferences } from './preferences.svelte.js';
  import { renderMarkdown } from 'shared/markdown';
  import { referenceScopeForPath } from 'shared/markdown-references';
  let {
    value,
    allowReferences = false,
    referenceScope,
    onresize
  }: {
    value: string;
    allowReferences?: boolean;
    referenceScope?: string;
    onresize?: (index: number, width: number) => void;
  } = $props();
  const language = $derived(preferences.language);
  // Render after hydration: task cards may wrap this component in a link, and
  // HTML parsers repair nested anchors differently from DOM insertion.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
  const blocks = $derived(
    mounted
      ? renderMarkdown(value, {
          referenceScope: allowReferences
            ? (referenceScope ?? referenceScopeForPath(page.url.pathname))
            : undefined
        })
      : []
  );
</script>

{#if !mounted}<div class="markdown-skeleton" aria-hidden="true">
    <span></span><span></span><span></span>
  </div>
{:else if !value.trim()}<p class="muted">No description.</p>
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
    border-radius: var(--radius-sm, 4px);
  }
  .markdown-skeleton span:last-child {
    width: 65%;
  }
</style>
