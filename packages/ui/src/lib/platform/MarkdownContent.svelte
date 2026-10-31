<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import Markdown from './Markdown.svelte';
  import { preferences } from './preferences.svelte.js';
  import { renderMarkdown, type ResolvedDocLink } from 'shared/markdown';
  import { referenceScopeForPath } from 'shared/markdown-references';
  import { docLinkCandidates } from 'shared/docs';
  import { contentLocale, type ContentLocale } from 'shared/content-locales';
  let {
    value,
    allowReferences = false,
    docs = false,
    docLocale,
    referenceScope,
    onresize
  }: {
    value: string;
    allowReferences?: boolean;
    /** Resolves `[page]` links like a documentation page does. */
    docs?: boolean;
    docLocale?: ContentLocale;
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
  const scope = $derived(referenceScope ?? referenceScopeForPath(page.url.pathname));
  // Page names need data, so they are looked up once per distinct set of links.
  const targets = $derived(docs ? docLinkCandidates(value).map((target) => target.raw) : []);
  const targetKey = $derived(targets.join('\n'));
  const locale = $derived(docLocale ?? contentLocale(language));
  const context = $derived(`${scope}:${locale}`);
  let resolvedContext = $state('');
  let links = $state<Record<string, ResolvedDocLink | null>>({});
  $effect(() => {
    if (resolvedContext !== context) {
      links = {};
      resolvedContext = context;
    }
    const requested = targetKey ? targetKey.split('\n') : [];
    const missing = requested.filter((target) => !(target in links));
    if (!mounted || !missing.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/platform/docs/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, locale, targets: missing }),
        signal: controller.signal
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((found) => {
          if (found) links = { ...links, ...found };
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });
  const blocks = $derived(
    mounted
      ? renderMarkdown(value, {
          referenceScope: allowReferences || docs ? scope : undefined,
          docs: docs
            ? {
                // Until a name is looked up it stays as typed rather than flashing as missing.
                resolve: (target) =>
                  target.raw in links
                    ? (links[target.raw] ?? null)
                    : { href: null, label: `[${target.raw}]`, title: '' }
              }
            : undefined
        })
      : []
  );
</script>

{#if !mounted}<div class="markdown-skeleton" aria-hidden="true">
    <span></span><span></span><span></span>
  </div>
{:else if !value.trim()}<p class="muted">Brak opisu.</p>
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
