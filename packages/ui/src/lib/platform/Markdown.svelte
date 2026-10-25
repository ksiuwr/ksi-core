<script lang="ts">
  import { imageResize } from './image-resize';
  import { tick, onDestroy } from 'svelte';
  import { X, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { MarkdownBlock } from 'shared/markdown';
  let {
    blocks,
    language = 'pl',
    onresize
  }: {
    blocks: MarkdownBlock[];
    language?: 'pl' | 'en';
    onresize?: (index: number, width: number) => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  function close() {
    dialog?.close();
    active = null;
  }
  $effect(() => {
    if (active) {
      void tick().then(() => {
        if (dialog && !dialog.open) dialog.showModal();
      });
    }
  });
  let active = $state<{ ids: string[]; index: number } | null>(null);

  type PreviewData = { title: string; type: string; number: number; href: string };
  let previewVisible = $state(false);
  let previewLoading = $state(false);
  let previewError = $state(false);
  let previewData = $state<PreviewData | null>(null);
  let previewPos = $state({ left: 0, top: 0 });
  let previewEl = $state<HTMLDivElement>();
  let currentLink = $state<HTMLElement | null>(null);
  let previewToken = 0;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const labels = $derived(
    language === 'pl'
      ? {
          loading: 'Ładowanie…',
          unavailable: 'Podgląd niedostępny',
          open: 'Otwórz',
          task: 'Zadanie',
          thread: 'Wątek'
        }
      : {
          loading: 'Loading…',
          unavailable: 'Preview unavailable',
          open: 'Open',
          task: 'Task',
          thread: 'Thread'
        }
  );

  function positionPreview(link: HTMLElement) {
    const rect = link.getBoundingClientRect();
    const width = 280;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    let top = rect.bottom + 8;
    const estimatedHeight = 104;
    if (top + estimatedHeight > window.innerHeight - 8)
      top = Math.max(8, rect.top - estimatedHeight - 8);
    previewPos = { left, top };
  }

  function showPreview(link: HTMLElement) {
    const scope = link.dataset.referenceScope;
    const number = Number(link.dataset.referenceNumber);
    if (!scope || !number) return;
    if (currentLink === link && previewVisible) return;
    clearTimeout(hideTimer);
    currentLink = link;
    previewData = null;
    previewError = false;
    previewLoading = true;
    previewVisible = true;
    positionPreview(link);
    const token = ++previewToken;
    void (async () => {
      try {
        const response = await fetch(
          `/api/platform/references/${encodeURIComponent(scope)}/${number}`
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (token !== previewToken) return;
        previewData = {
          title: data.title,
          type: data.type,
          number: data.number,
          href: data.href
        };
      } catch {
        if (token === previewToken) previewError = true;
      } finally {
        if (token === previewToken) previewLoading = false;
      }
    })();
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      previewVisible = false;
      previewData = null;
      previewError = false;
      previewLoading = false;
      currentLink = null;
    }, 120);
  }

  function handleMouseOver(event: MouseEvent) {
    const link = (event.target as HTMLElement | null)?.closest?.(
      '.reference-link'
    ) as HTMLElement | null;
    if (!link) return;
    if (link === currentLink) return;
    showPreview(link);
  }

  function handleMouseOut(event: MouseEvent) {
    const link = (event.target as HTMLElement | null)?.closest?.(
      '.reference-link'
    ) as HTMLElement | null;
    if (!link) return;
    const related = event.relatedTarget as Node | null;
    if (related && (link.contains(related) || previewEl?.contains(related))) return;
    scheduleHide();
  }

  function handleFocusIn(event: FocusEvent) {
    const link = (event.target as HTMLElement | null)?.closest?.(
      '.reference-link'
    ) as HTMLElement | null;
    if (!link) return;
    showPreview(link);
  }

  function handleFocusOut(event: FocusEvent) {
    const link = (event.target as HTMLElement | null)?.closest?.(
      '.reference-link'
    ) as HTMLElement | null;
    if (!link) return;
    const related = event.relatedTarget as Node | null;
    if (related && (link.contains(related) || previewEl?.contains(related))) return;
    scheduleHide();
  }

  onDestroy(() => clearTimeout(hideTimer));
</script>

<div
  class="markdown"
  bind:this={container}
  onmouseover={handleMouseOver}
  onmouseout={handleMouseOut}
  onfocusin={handleFocusIn}
  onfocusout={handleFocusOut}
  onmouseleave={scheduleHide}
  use:imageResize={{ language, onresize, blocks }}
>
  {#each blocks as block}{#if block.type === 'html'}{@html block.html}{:else}<div class="gallery">
        {#each block.ids.slice(0, block.preview) as id, index}<button
            type="button"
            onclick={() => (active = { ids: block.ids, index })}
            aria-label={`${'Open image'} ${index + 1}`}
            ><img
              src={`/media/${id}`}
              alt={`${'Gallery image'} ${index + 1}`}
              loading="lazy"
            /></button
          >{/each}{#if block.ids.length > block.preview}<button
            type="button"
            onclick={() => (active = { ids: block.ids, index: block.preview })}
            >+{block.ids.length - block.preview}</button
          >{/if}
      </div>{/if}{/each}
</div>
{#if previewVisible}
  <div
    bind:this={previewEl}
    class="reference-preview"
    style:left="{previewPos.left}px"
    style:top="{previewPos.top}px"
    onmouseenter={() => clearTimeout(hideTimer)}
    onmouseleave={scheduleHide}
    role="tooltip"
  >
    {#if previewLoading && !previewData}
      <p class="reference-preview-loading">{labels.loading}</p>
    {:else if previewError}
      <p class="reference-preview-error">{labels.unavailable}</p>
    {:else if previewData}
      <p class="reference-preview-type">
        {previewData.type === 'item' ? labels.task : labels.thread}
      </p>
      <p class="reference-preview-number">#{previewData.number}</p>
      <p class="reference-preview-title">{previewData.title}</p>
      <a class="reference-preview-link" href={previewData.href}>{labels.open}</a>
    {/if}
  </div>
{/if}
{#if active}<dialog
    bind:this={dialog}
    aria-label={'Gallery'}
    class="lightbox"
    oncancel={(event) => {
      event.preventDefault();
      close();
    }}
  >
    <button type="button" onclick={close}><X size={16} aria-hidden="true" />{'Close'}</button>
    <div class="row">
      <button
        type="button"
        onclick={() =>
          (active = {
            ids: active!.ids,
            index: (active!.index - 1 + active!.ids.length) % active!.ids.length
          })}
        aria-label={'Previous image'}><ChevronLeft size={20} aria-hidden="true" /></button
      ><img
        src={`/media/${active.ids[active.index]}`}
        alt={`${'Gallery image'} ${active.index + 1}`}
      /><button
        type="button"
        onclick={() =>
          (active = {
            ids: active!.ids,
            index: (active!.index + 1) % active!.ids.length
          })}
        aria-label={'Next image'}><ChevronRight size={20} aria-hidden="true" /></button
      >
    </div>
  </dialog>{/if}

<style>
  .markdown {
    overflow-wrap: anywhere;
  }
  .markdown :global(.reference-link) {
    color: var(--accent, #a33d29);
    text-decoration: none;
    border-bottom: 1px dotted currentColor;
  }
  .markdown :global(.reference-link:hover) {
    text-decoration: underline;
  }
  .markdown :global(pre) {
    background: var(--surface-muted, #edf1ed);
    padding: 16px;
    overflow: auto;
  }
  .markdown :global(img) {
    max-width: 100%;
    height: auto;
  }
  .markdown :global(.markdown-image-frame) {
    display: inline-block;
    max-width: 100%;
  }
  .markdown :global(.image-resize-frame) {
    position: relative;
    display: inline-block;
    max-width: 100%;
    line-height: 0;
    outline: 1px solid var(--line, #acbdb4);
  }
  .markdown :global(.image-resize-handle) {
    position: absolute;
    right: -5px;
    bottom: -5px;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 2px solid var(--surface, white);
    border-radius: 3px;
    background: var(--ink, #272638);
    cursor: ew-resize;
    touch-action: none;
  }
  .markdown :global(.image-resize-handle:focus-visible) {
    outline: 2px solid var(--ink, #272638);
    outline-offset: 3px;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .gallery img {
    width: 100%;
    aspect-ratio: 1.3;
    object-fit: cover;
  }
  .gallery button {
    padding: 0;
  }
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 100;
    width: min(95vw, 1000px);
    max-height: 95vh;
    border: 1px solid var(--line, #acbdb4);
    border-radius: 12px;
    background: var(--surface, white);
    color: var(--ink, #272638);
    padding: 20px;
  }
  .lightbox::backdrop {
    background: #0009;
  }
  .lightbox img {
    max-height: 75vh;
    max-width: 70%;
    object-fit: contain;
  }
  .reference-preview {
    position: fixed;
    z-index: 1000;
    width: 280px;
    padding: 10px 12px;
    border: 1px solid var(--line, #acbdb4);
    border-radius: 6px;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    box-shadow: 0 8px 24px #0003;
    font-size: 12px;
  }
  .reference-preview-type {
    margin: 0 0 2px;
    color: var(--muted, #6b6974);
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .reference-preview-number {
    margin: 0 0 4px;
    color: var(--accent, #a64128);
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 12px;
    font-weight: 600;
  }
  .reference-preview-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
  .reference-preview-link {
    font-size: 11px;
    color: var(--accent, #a33d29);
  }
  .reference-preview-loading,
  .reference-preview-error {
    margin: 0;
    color: var(--muted, #6b6974);
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .reference-preview {
      width: min(280px, calc(100vw - 16px));
    }
  }
</style>
