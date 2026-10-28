<script lang="ts">
  import type { FrontendLocale } from 'shared/content-locales';
  import { formatDate as formatLocaleDate } from 'shared/format';
  import { imageResize } from './image-resize.js';
  import { tick, onDestroy } from 'svelte';
  import { X, ChevronLeft, ChevronRight, ArrowUpRight, CalendarClock } from '@lucide/svelte';
  import type { MarkdownBlock } from 'shared/markdown';
  let {
    blocks,
    language = 'pl',
    onresize
  }: {
    blocks: MarkdownBlock[];
    language?: FrontendLocale;
    onresize?: (index: number, width: number) => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let container = $state<HTMLDivElement>();
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

  type PreviewData = {
    title: string;
    type: string;
    number: number;
    href: string;
    workspace: string | null;
    createdAt: string;
    dueAt: string | null;
    assignees: string[];
    author: string | null;
    labels: string[];
    status: string | null;
    statusName: string | null;
    statusColor: string | null;
    excerpt: string | null;
  };
  let previewVisible = $state(false);
  let previewLoading = $state(false);
  let previewError = $state(false);
  let previewNotFound = $state(false);
  let previewData = $state<PreviewData | null>(null);
  let previewPos = $state({ left: 0, top: 0 });
  let previewEl = $state<HTMLDivElement>();
  let currentLink = $state<HTMLElement | null>(null);
  let previewToken = 0;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const initials = (name?: string | null) => {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    const value = `${words[0]?.[0] ?? ''}${words.length > 1 ? words[words.length - 1]![0] : ''}`;
    return value.toUpperCase() || '?';
  };
  const formatDate = (iso: string) =>
    formatLocaleDate(iso, language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  function positionPreview(link: HTMLElement) {
    const rect = link.getBoundingClientRect();
    const width = 340;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    const estimatedHeight = 330;
    let top = rect.bottom + 8;
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
    previewNotFound = false;
    previewLoading = true;
    previewVisible = true;
    positionPreview(link);
    void tick().then(() => {
      try {
        previewEl?.showPopover();
      } catch {
        // Ignore repeated open calls.
      }
    });
    const token = ++previewToken;
    void (async () => {
      try {
        const response = await fetch(
          `/api/platform/references/${encodeURIComponent(scope)}/${number}`
        );
        if (!response.ok) {
          if (response.status === 404) throw new Error('not-found');
          throw new Error('preview-failed');
        }
        const data = await response.json();
        if (token !== previewToken) return;
        previewData = {
          title: data.title,
          type: data.type,
          number: data.number,
          href: data.href,
          workspace: data.workspace ?? null,
          createdAt: data.createdAt,
          dueAt: data.dueAt ?? null,
          assignees: Array.isArray(data.assignees) ? data.assignees : [],
          author: data.author ?? null,
          labels: Array.isArray(data.labels) ? data.labels : [],
          status: data.status ?? null,
          statusName: data.statusName ?? null,
          statusColor: data.statusColor ?? null,
          excerpt: data.excerpt ?? null
        };
      } catch (error) {
        if (token === previewToken) {
          if (error instanceof Error && error.message === 'not-found') previewNotFound = true;
          else previewError = true;
        }
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
      previewNotFound = false;
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

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
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
  {#if previewVisible}
    <div
      bind:this={previewEl}
      class="reference-preview"
      popover="manual"
      style:left="{previewPos.left}px"
      style:top="{previewPos.top}px"
      onmouseenter={() => clearTimeout(hideTimer)}
      onmouseleave={scheduleHide}
      role="tooltip"
    >
      {#if previewLoading && !previewData}
        <p class="reference-preview-loading">Loading…</p>
      {:else if previewNotFound}
        <p class="reference-preview-error">Reference not found</p>
      {:else if previewError}
        <p class="reference-preview-error">Preview unavailable</p>
      {:else if previewData}
        <div class="reference-preview-header">
          <p class="reference-preview-context">
            <span
              >{#if previewData.workspace}{previewData.workspace}{:else}Association{/if}</span
            >
            <span class="reference-preview-separator" aria-hidden="true">·</span>
            <span
              >{#if previewData.type === 'item'}Task{:else}Thread{/if}</span
            >
            <span class="reference-preview-separator" aria-hidden="true">·</span>
            <time datetime={previewData.createdAt}>{formatDate(previewData.createdAt)}</time>
          </p>
          <p class="reference-preview-title">
            {previewData.title}<span class="reference-preview-number">#{previewData.number}</span>
          </p>
          {#if previewData.statusName}
            <span
              class="reference-preview-status"
              style:--status-color={previewData.statusColor || 'var(--accent, #a64128)'}
            >
              <span class="reference-preview-status-dot" aria-hidden="true"></span>
              {previewData.statusName}
            </span>
          {/if}
        </div>
        {#if previewData.type === 'item'}
          <p class="reference-preview-excerpt" class:empty={!previewData.excerpt}>
            {#if previewData.excerpt}{previewData.excerpt}{:else}No description.{/if}
          </p>
        {/if}
        {#if previewData.labels.length}
          <div class="reference-preview-labels">
            {#each previewData.labels as label}
              <span class="reference-preview-chip">{label}</span>
            {/each}
          </div>
        {/if}
        <div class="reference-preview-footer">
          <p class="reference-preview-person">
            <span class="reference-preview-avatar" aria-hidden="true"
              >{initials(previewData.author)}</span
            >
            <span>
              <strong
                >{#if previewData.author}{previewData.author}{:else}Association member{/if}</strong
              >
              <span class="reference-preview-muted"
                >{#if previewData.type === 'item'}opened this task{:else}opened this thread{/if}</span
              >
            </span>
          </p>
          {#if previewData.assignees.length}
            <p class="reference-preview-person">
              <span class="reference-preview-avatar-stack" aria-hidden="true">
                {#each previewData.assignees.slice(0, 3) as name}
                  <span class="reference-preview-avatar">{initials(name)}</span>
                {/each}
              </span>
              <span>{previewData.assignees.join(', ')}</span>
            </p>
          {/if}
          {#if previewData.dueAt}
            <p class="reference-preview-person">
              <CalendarClock size={14} aria-hidden="true" />
              <span>
                {'Due'}:
                <time datetime={previewData.dueAt}>{formatDate(previewData.dueAt)}</time>
              </span>
            </p>
          {/if}
        </div>
        <a class="reference-preview-link" href={previewData.href}>
          <span>Open</span>
          <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      {/if}
    </div>
  {/if}
</div>
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
    position: relative;
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
    inset: auto;
    margin: 0;
    z-index: 1000;
    width: 340px;
    padding: 0;
    border: 1px solid var(--line, #acbdb4);
    border-radius: 8px;
    background: var(--surface, #fffefa);
    color: var(--ink, #272638);
    box-shadow: var(--shadow-lg, 0 12px 32px #0004);
    font-size: 12px;
    overflow: hidden;
  }
  .reference-preview-header {
    display: grid;
    gap: 6px;
    padding: 12px 14px;
    background: var(--surface-muted, #edf1ed);
    border-bottom: 1px solid var(--line, #acbdb4);
  }
  .reference-preview-context {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin: 0;
    color: var(--muted, #6b6974);
    font-size: 11px;
    line-height: 1.3;
  }
  .reference-preview-separator {
    opacity: 0.6;
  }
  .reference-preview-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .reference-preview-number {
    margin-left: 6px;
    color: var(--muted, #6b6974);
    font-family: var(--mono, ui-monospace, monospace);
    font-size: 12px;
    font-weight: 500;
  }
  .reference-preview-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    justify-self: start;
    margin-top: 2px;
    padding: 2px 9px;
    border: 1px solid color-mix(in srgb, var(--status-color, #6b7280) 45%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--status-color, #6b7280) 16%, transparent);
    color: var(--status-color, #6b7280);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.5;
  }
  .reference-preview-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .reference-preview-excerpt {
    display: -webkit-box;
    margin: 0;
    padding: 12px 14px;
    color: var(--muted, #6b6974);
    font-size: 12px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
  .reference-preview-excerpt.empty {
    font-style: italic;
  }
  .reference-preview-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 0 14px 12px;
  }
  .reference-preview-chip {
    display: inline-block;
    padding: 1px 8px;
    border: 1px solid var(--line, #acbdb4);
    border-radius: 999px;
    background: var(--surface-muted, #edf1ed);
    font-size: 11px;
    line-height: 1.6;
  }
  .reference-preview-footer {
    display: grid;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--line, #acbdb4);
  }
  .reference-preview-person {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    min-width: 0;
    color: var(--ink, #272638);
    font-size: 12px;
    line-height: 1.4;
  }
  .reference-preview-person > span:last-child {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .reference-preview-muted {
    margin-left: 4px;
    color: var(--muted, #6b6974);
  }
  .reference-preview-avatar {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    border: 1px solid var(--line, #acbdb4);
    border-radius: 50%;
    background: var(--surface-muted, #edf1ed);
    color: var(--muted, #6b6974);
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
  }
  .reference-preview-avatar-stack {
    display: flex;
    flex: 0 0 auto;
  }
  .reference-preview-avatar-stack .reference-preview-avatar + .reference-preview-avatar {
    margin-left: -7px;
  }
  .reference-preview-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 14px;
    border-top: 1px solid var(--line, #acbdb4);
    color: var(--accent, #a33d29);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }
  .reference-preview-link:hover,
  .reference-preview-link:focus-visible {
    background: var(--surface-muted, #edf1ed);
  }
  .reference-preview-loading,
  .reference-preview-error {
    margin: 0;
    padding: 12px 14px;
    color: var(--muted, #6b6974);
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .reference-preview {
      width: min(340px, calc(100vw - 16px));
    }
  }
</style>
