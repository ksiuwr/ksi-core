<script lang="ts">
  import { imagePreview } from './image-preview';
  import { imageResize } from './image-resize';
  import { tick } from 'svelte';
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
  type Image = { src: string; alt: string };
  let active = $state<{ images: Image[]; index: number } | null>(null);
  let zoomed = $state(false);
  function open(images: Image[], index: number) {
    zoomed = false;
    active = { images, index };
  }
  function navigate(direction: number) {
    if (!active) return;
    zoomed = false;
    active = {
      images: active.images,
      index: (active.index + direction + active.images.length) % active.images.length
    };
  }
  const galleryImages = (ids: string[]) =>
    ids.map((id, index) => ({ src: `/media/${id}`, alt: `Gallery image ${index + 1}` }));
</script>

<div
  class="markdown"
  use:imageResize={{ language, onresize, blocks }}
  use:imagePreview={{ blocks, enabled: !onresize, open }}
>
  {#each blocks as block}{#if block.type === 'html'}{@html block.html}{:else}<div class="gallery">
        {#each block.ids.slice(0, block.preview) as id, index}<button
            type="button"
            onclick={() => open(galleryImages(block.ids), index)}
            aria-label={`${'Open image'} ${index + 1}`}
            ><img
              src={`/media/${id}`}
              alt={`${'Gallery image'} ${index + 1}`}
              loading="lazy"
            /></button
          >{/each}{#if block.ids.length > block.preview}<button
            type="button"
            onclick={() => open(galleryImages(block.ids), block.preview)}
            >+{block.ids.length - block.preview}</button
          >{/if}
      </div>{/if}{/each}
</div>
{#if active}<dialog
    bind:this={dialog}
    aria-label={'Gallery'}
    onkeydown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }}
    class="lightbox"
    oncancel={(event) => {
      event.preventDefault();
      close();
    }}
  >
    <div class="row">
      <button type="button" onclick={close}><X size={16} aria-hidden="true" />{'Close'}</button>
      <button type="button" aria-pressed={zoomed} onclick={() => (zoomed = !zoomed)}
        >{language === 'pl' ? 'Powiększ' : 'Zoom'}</button
      >
      <a href={active.images[active.index].src} download target="_blank" rel="noopener noreferrer"
        >{language === 'pl' ? 'Pobierz oryginał' : 'Download original'}</a
      >
    </div>
    <div class="lightbox-view" class:zoomed>
      {#if active.images.length > 1}<button
          type="button"
          onclick={() => navigate(-1)}
          aria-label={'Previous image'}><ChevronLeft size={20} aria-hidden="true" /></button
        >{/if}
      <img src={active.images[active.index].src} alt={active.images[active.index].alt} />
      {#if active.images.length > 1}<button
          type="button"
          onclick={() => navigate(1)}
          aria-label={'Next image'}><ChevronRight size={20} aria-hidden="true" /></button
        >{/if}
    </div>
  </dialog>{/if}

<style>
  .markdown {
    overflow-wrap: anywhere;
  }
  .markdown :global(.image-preview-trigger) {
    display: inline-block;
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
  }
  .lightbox-view {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    overflow: auto;
    margin-top: 16px;
  }
  .lightbox-view.zoomed {
    display: block;
    max-height: 75vh;
  }
  .lightbox-view.zoomed img {
    max-width: none;
    max-height: none;
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
  @media (max-width: 600px) {
    .gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
