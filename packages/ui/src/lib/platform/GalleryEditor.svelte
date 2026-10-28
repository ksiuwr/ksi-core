<script lang="ts">
  import { Check, GripVertical, UploadCloud, LoaderCircle, X } from '@lucide/svelte';
  import { preferences } from './preferences.svelte.js';
  import GalleryImage from './GalleryImage.svelte';
  import {
    moveGalleryImage,
    removeGalleryImage,
    toggleGalleryImage,
    type GalleryState
  } from 'shared/markdown-gallery';

  let {
    gallery,
    busy = false,
    names = {},
    uploads = [],
    onchange,
    onupload,
    onremove
  }: {
    gallery: GalleryState;
    busy?: boolean;
    names?: Record<string, string>;
    uploads?: { key: number; name: string; status: 'queued' | 'uploading' }[];
    onchange: (gallery: GalleryState) => void;
    onupload: (files: FileList | null) => void;
    onremove: () => void;
  } = $props();
  const language = $derived(preferences.language);
  const uid = $props.id();
  let input = $state<HTMLInputElement>();
  let dropping = $state(false);
  let dragged = $state<string | null>(null);
  let dropTarget = $state<string | null>(null);
  let pointer: { id: number; x: number; y: number; moved: boolean } | undefined;
  const labels = $derived(
    language === 'pl'
      ? {
          title: 'Galeria',
          help: 'Kliknij zdjęcie, aby pokazać je w podglądzie. Przeciągnij uchwyt, aby zmienić kolejność w grupie.',
          preview: 'Zdjęcia w podglądzie',
          upload: 'Upuść zdjęcia tutaj lub wybierz pliki',
          removeGallery: 'Usuń galerię',
          image: 'Zdjęcie',
          remove: 'Usuń zdjęcie',
          reorder: 'Zmień kolejność zdjęcia',
          keyboard: 'Użyj klawiszy strzałek, aby zmienić kolejność.',
          limit: 'W podglądzie można pokazać do 30 zdjęć.',
          uploading: 'Przesyłanie…',
          queued: 'Oczekiwanie…'
        }
      : {
          title: 'Gallery',
          help: 'Click an image to include it in the preview. Drag its handle to reorder within its group.',
          preview: 'Images in preview',
          upload: 'Drop images here or choose files',
          removeGallery: 'Remove gallery',
          image: 'Image',
          remove: 'Remove image',
          reorder: 'Reorder image',
          keyboard: 'Use arrow keys to change the order.',
          limit: 'The preview can show up to 30 images.',
          uploading: 'Uploading…',
          queued: 'Waiting…'
        }
  );
  // @wc-ignore
  const keys = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };

  function pointerMove(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId || !dragged) return;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 6)
      return;
    pointer.moved = true;
    const item = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-gallery-image]');
    const list = event.currentTarget instanceof Element ? event.currentTarget.closest('ul') : null;
    if (!item || item.closest('ul') !== list) {
      dropTarget = null;
      return;
    }
    const index = gallery.ids.indexOf(item.dataset.galleryImage ?? '');
    dropTarget = index >= 0 ? gallery.ids[index]! : null;
  }
  function endDrag(commit = false) {
    if (commit && pointer?.moved && dragged && dropTarget) {
      onchange(moveGalleryImage(gallery, dragged, gallery.ids.indexOf(dropTarget)));
    }
    dragged = null;
    dropTarget = null;
    pointer = undefined;
  }
</script>

<fieldset
  class="gallery-editor"
  class:dropping
  aria-busy={busy}
  ondragover={(event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    dropping = true;
  }}
  ondragleave={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dropping = false;
  }}
  ondrop={(event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    dropping = false;
    if (!busy) onupload(event.dataTransfer?.files ?? null);
  }}
>
  <legend>{labels.title}</legend>
  <div class="gallery-heading">
    <p id={`${uid}-help`}>{labels.help}</p>
    <button
      type="button"
      class="remove-gallery"
      disabled={busy}
      onclick={onremove}
      aria-label={labels.removeGallery}><X size={16} aria-hidden="true" /></button
    >
  </div>
  <p class="preview-count" role="status">
    {labels.preview}: {gallery.preview} / {gallery.ids.length}
  </p>
  <span class="sr-only" id={`${uid}-keyboard`}>{labels.keyboard}</span>
  {#if gallery.ids.length || uploads.length}<ul class="gallery-grid">
      {#each gallery.ids as id, index (id)}
        <li
          data-gallery-image={id}
          class:selected={index < gallery.preview}
          class:dragging={dragged === id}
          class:drop-target={dropTarget === id && dragged !== id}
        >
          <button
            type="button"
            class="image-toggle"
            aria-label={`${labels.image} ${index + 1}${names[id] ? `: ${names[id]}` : ''}`}
            aria-pressed={index < gallery.preview}
            aria-describedby={`${uid}-help`}
            disabled={busy || (index >= gallery.preview && gallery.preview >= 30)}
            onclick={() => onchange(toggleGalleryImage(gallery, id))}
          >
            <GalleryImage src={`/media/${id}`} alt={names[id] ?? ''} />
            <span class="selection" aria-hidden="true"
              >{#if index < gallery.preview}<Check size={14} />{index + 1}{/if}</span
            >
          </button>
          <div class="image-actions">
            <button
              type="button"
              class="drag-handle"
              disabled={busy}
              aria-label={`${labels.reorder} ${index + 1}`}
              aria-describedby={`${uid}-keyboard`}
              onpointerdown={(event) => {
                if (event.button !== 0) return;
                pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                dragged = id;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onpointermove={pointerMove}
              onpointerup={() => endDrag(true)}
              onpointercancel={() => endDrag()}
              onlostpointercapture={() => endDrag()}
              onkeydown={(event) => {
                const direction =
                  event.key === keys.left || event.key === keys.up
                    ? -1
                    : event.key === keys.right || event.key === keys.down
                      ? 1
                      : 0;
                if (!direction) return;
                event.preventDefault();
                onchange(moveGalleryImage(gallery, id, index + direction));
              }}><GripVertical size={16} aria-hidden="true" /></button
            >
            <button
              type="button"
              disabled={busy}
              aria-label={`${labels.remove} ${index + 1}`}
              onclick={() => onchange(removeGalleryImage(gallery, id))}
              ><X size={16} aria-hidden="true" /></button
            >
          </div>
        </li>
      {/each}
      {#each uploads as upload (upload.key)}
        <li class="upload-placeholder" aria-busy="true">
          <span class="upload-spinner"><LoaderCircle size={24} aria-hidden="true" /></span>
          <span role="status"
            >{upload.status === 'uploading' ? labels.uploading : labels.queued}<small
              >{upload.name}</small
            ></span
          >
        </li>
      {/each}
    </ul>{/if}
  {#if gallery.preview >= 30}<p>{labels.limit}</p>{/if}
  <input
    bind:this={input}
    class="file-input"
    type="file"
    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
    multiple
    disabled={busy}
    onchange={(event) => {
      onupload(event.currentTarget.files);
      event.currentTarget.value = '';
    }}
    tabindex="-1"
    aria-hidden="true"
  />
  <button
    type="button"
    class="gallery-dropzone"
    class:dropping
    disabled={busy}
    onclick={() => input?.click()}
    ><UploadCloud size={20} aria-hidden="true" />{busy ? labels.uploading : labels.upload}</button
  >
</fieldset>

<style>
  .gallery-editor {
    min-width: 0;
    margin: 8px 0 0;
    padding: 16px;
    border: 1px solid var(--line, #ddd);
    border-radius: var(--radius-lg, 8px);
  }
  .gallery-editor.dropping {
    border-color: var(--accent, #6750a4);
    background: var(--surface-muted);
  }
  legend {
    padding: 0 6px;
    font-size: 13px;
    font-weight: 600;
  }
  .gallery-heading {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  p {
    margin: 0 0 12px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }
  .gallery-heading p {
    flex: 1;
  }
  .preview-count {
    color: var(--ink);
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    color: var(--ink);
    font: inherit;
  }
  .remove-gallery {
    background: transparent;
    border: 0;
    padding: 2px;
  }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    padding: 0;
    margin: 0 0 12px;
    list-style: none;
  }
  li {
    position: relative;
    min-width: 0;
    border: 2px solid var(--line, #ddd);
    border-radius: var(--radius-md, 6px);
    overflow: hidden;
  }
  li.selected {
    border-color: var(--accent, #6750a4);
  }
  li.drop-target {
    box-shadow: inset 0 0 0 4px var(--accent, #6750a4);
    outline: 2px dashed var(--accent, #6750a4);
    outline-offset: 2px;
  }
  li.dragging {
    outline: 2px solid var(--accent, #6750a4);
    outline-offset: 2px;
  }
  .image-toggle {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: var(--surface-muted);
  }
  li:not(.selected) .image-toggle {
    opacity: 0.65;
  }
  .upload-placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    aspect-ratio: 1.3;
    padding: 12px;
    border-style: dashed;
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 12px;
    text-align: center;
  }
  .upload-placeholder small {
    display: block;
    margin-top: 6px;
    overflow-wrap: anywhere;
  }
  .upload-spinner {
    display: inline-flex;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .upload-spinner {
      animation: none;
    }
  }
  .selection {
    position: absolute;
    left: 8px;
    bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 24px;
    height: 24px;
    padding: 0 4px;
    border-radius: 4px;
    border: 1px solid #fff;
    color: #fff;
    background: #0008;
    font-size: 11px;
  }
  .selected .selection {
    background: var(--accent, #6750a4);
  }
  .image-actions {
    position: absolute;
    right: 4px;
    top: 4px;
    display: flex;
    gap: 4px;
  }
  .image-actions button {
    width: 32px;
    height: 32px;
    padding: 0;
    color: #fff;
    background: #000a;
    border: 1px solid #fff4;
    border-radius: var(--radius-md, 6px);
  }
  .drag-handle {
    touch-action: none;
    cursor: grab;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .gallery-dropzone {
    width: 100%;
    min-height: 86px;
    padding: 16px;
    border: 1px dashed var(--line, #aaa);
    border-radius: var(--radius-lg, 8px);
    background: transparent;
    color: var(--muted);
    font-size: 12px;
  }
  .gallery-dropzone:hover,
  .gallery-dropzone.dropping {
    border-color: var(--accent, #6750a4);
    background: var(--surface-muted);
    color: var(--ink);
  }
  button:focus-visible {
    outline: 2px solid var(--accent, #6750a4);
    outline-offset: 2px;
  }
  button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .file-input {
    display: none;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @media (max-width: 540px) {
    .gallery-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .gallery-editor {
      padding: 12px;
    }
  }
</style>
