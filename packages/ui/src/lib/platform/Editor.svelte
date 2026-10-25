<script lang="ts">
  import {
    insertMarkdownGallery,
    markdownGalleries,
    updateMarkdownGallery,
    type GalleryState
  } from 'shared/markdown-gallery';
  import GalleryEditor from './GalleryEditor.svelte';
  import { markdownImages } from 'shared/markdown-images';
  import { resizeMarkdownImage } from 'shared/markdown-images';
  import MarkdownContent from './MarkdownContent.svelte';
  import { Eye, Pencil, Images, Paperclip, LoaderCircle, ChevronDown } from '@lucide/svelte';
  let {
    value = $bindable(''),
    language = 'pl',
    rows = 10,
    allowGallery = false,
    allowReferences = false,
    referenceScope
  }: {
    value?: string;
    language?: 'pl' | 'en';
    rows?: number;
    allowGallery?: boolean;
    allowReferences?: boolean;
    referenceScope?: string;
  } = $props();
  const uid = $props.id();
  const labels = $derived(
    language === 'pl'
      ? {
          uploading: 'Przesyłanie…',
          queued: 'Oczekiwanie…',
          write: 'Edytuj',
          preview: 'Podgląd',
          gallery: 'Dodaj galerię',
          galleryName: 'Galeria',
          newGallery: 'Nowa galeria',
          images: 'Zdjęcia',
          drop: 'Upuść pliki w polu tekstowym lub wybierz załączniki',
          insert: 'Wstaw galerię',
          imagesOnly: 'Do galerii można dodać tylko obrazy JPEG, PNG, WebP, AVIF lub GIF.',
          placeholder: 'Napisz treść w Markdown…',
          attachments: 'Załącz pliki',
          referenceHint: 'Wpisz #, aby odwołać się do zadania lub wątku.',
          referenceTask: 'Zadanie',
          referenceThread: 'Wątek',
          referenceAssociation: 'Ogólne',
          referenceArchived: 'Zarchiwizowane',
          referenceEmpty: 'Brak pasujących zadań lub wątków.'
        }
      : {
          uploading: 'Uploading…',
          queued: 'Waiting…',
          write: 'Write',
          preview: 'Preview',
          gallery: 'Add gallery',
          galleryName: 'Gallery',
          newGallery: 'New gallery',
          images: 'Images',
          drop: 'Drop files into the text field or choose attachments',
          insert: 'Insert gallery',
          imagesOnly: 'Galleries accept JPEG, PNG, WebP, AVIF or GIF images only.',
          placeholder: 'Write a Markdown description…',
          attachments: 'Attach files',
          referenceHint: 'Type # to reference a task or thread.',
          referenceTask: 'Task',
          referenceThread: 'Thread',
          referenceAssociation: 'Association',
          referenceArchived: 'Archived',
          referenceEmpty: 'No matching tasks or threads.'
        }
  );

  let message = $state(''),
    preview = $state(false),
    busy = $state(false),
    dragging = $state(false);
  let input = $state<HTMLInputElement>();
  let galleryPicker = $state(false);
  let activeGallery = $state<number | 'draft' | null>(null);
  let uploadTarget = $state<'content' | 'draft' | number>('content');
  let pendingUploads = $state<{ key: number; name: string; status: 'queued' | 'uploading' }[]>([]);
  let galleryDraft = $state<GalleryState>({ ids: [], preview: 0 });
  let uploadedImages = $state<{ id: string; name: string }[]>([]);
  const galleries = $derived(markdownGalleries(value));
  const inlineImages = $derived(
    markdownImages(value).flatMap((image) => {
      const match = image.href.match(/^file:([A-Za-z0-9_-]{8,64})$/);
      return match ? [{ id: match[1], name: image.text }] : [];
    })
  );
  const imageNames = $derived(
    Object.fromEntries([...inlineImages, ...uploadedImages].map((image) => [image.id, image.name]))
  );

  function beginGallery() {
    preview = false;
    if (!galleryPicker) {
      const ids = [...new Set(inlineImages.map((image) => image.id))];
      galleryDraft = { ids, preview: Math.min(3, ids.length) };
      galleryPicker = true;
      activeGallery = 'draft';
    } else activeGallery = activeGallery === 'draft' ? null : 'draft';
  }
  function insertGallery() {
    const index = galleries.length;
    value = insertMarkdownGallery(value, galleryDraft.ids, galleryDraft.preview);
    galleryPicker = false;
    galleryDraft = { ids: [], preview: 0 };
    activeGallery = index;
    preview = false;
  }
  function changeGallery(index: number, gallery: GalleryState) {
    value = updateMarkdownGallery(value, index, gallery);
    if (!gallery.ids.length) activeGallery = null;
  }
  async function upload(
    files: FileList | File[] | null,
    target: 'content' | 'draft' | number = 'content'
  ) {
    if (!files?.length || busy) return;
    busy = true;
    message = '';
    const uploads = Array.from(files).filter((file) => {
      if (
        target === 'content' ||
        ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)
      )
        return true;
      message = labels.imagesOnly;
      return false;
    });
    uploadTarget = target;
    pendingUploads = uploads.map((file, key) => ({ key, name: file.name, status: 'queued' }));
    try {
      for (const [key, file] of uploads.entries()) {
        pendingUploads = pendingUploads.map((upload) =>
          upload.key === key ? { ...upload, status: 'uploading' } : upload
        );
        const body = new FormData();
        body.set('file', file);
        const response = await fetch('/api/files', { method: 'POST', body });
        const data = await response.json();
        if (!response.ok) throw new Error(`${file.name}: ${data.code ?? 'Upload failed.'}`);
        pendingUploads = pendingUploads.filter((upload) => upload.key !== key);
        if (file.type.startsWith('image/'))
          uploadedImages = [...uploadedImages, { id: data.id, name: file.name }];
        if (target !== 'content') {
          const gallery = target === 'draft' ? galleryDraft : galleries[target];
          if (!gallery || gallery.ids.includes(data.id)) continue;
          const selected = gallery.preview === gallery.ids.length && gallery.preview < 3;
          const ids = [...gallery.ids];
          ids.splice(selected ? gallery.preview : ids.length, 0, data.id);
          const updated = { ids, preview: gallery.preview + Number(selected) };
          if (target === 'draft') galleryDraft = updated;
          else changeGallery(target, updated);
        } else {
          value += `\n${file.type.startsWith('image/') ? '!' : ''}[${file.name.replace(/[[\]\\]/g, '_')}](file:${data.id})\n`;
        }
      }
    } catch (error) {
      message = error instanceof Error ? error.message : 'Upload failed.';
    } finally {
      pendingUploads = [];
      busy = false;
      if (input) input.value = '';
    }
  }

  type User = { id: string; name: string; nickname: string | null; image: string | null };
  type Reference = {
    reference: string;
    number: number;
    title: string;
    type: 'item' | 'thread';
    scope: string;
    scopeLabel: string | null;
    archived: boolean;
  };
  let textarea: HTMLTextAreaElement | undefined = $state();
  let autocompleteKind = $state<'user' | 'reference' | null>(null);
  let autocompleteQuery = $state('');
  let autocompleteResults = $state<User[]>([]);
  let referenceResults = $state<Reference[]>([]);
  let autocompleteIndex = $state(0);
  let mentionStart = $state(0);
  let referenceStart = $state(0);
  let userRequest = 0;
  let referenceRequest = 0;

  function currentReferenceScope() {
    if (referenceScope) return referenceScope;
    if (typeof window === 'undefined') return '~association';
    return decodeURIComponent(
      window.location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? '~association'
    );
  }

  async function searchUsers(q: string) {
    const request = ++userRequest;
    if (!q) {
      autocompleteResults = [];
      return;
    }
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const results = response.ok ? await response.json() : [];
      if (request !== userRequest) return;
      autocompleteResults = Array.isArray(results) ? results : [];
      autocompleteIndex = 0;
    } catch {
      if (request === userRequest) {
        autocompleteResults = [];
        autocompleteIndex = 0;
      }
    }
  }

  async function searchReferences(q: string) {
    const request = ++referenceRequest;
    const params = new URLSearchParams({ q, scope: currentReferenceScope() });
    try {
      const response = await fetch(`/api/platform/references/search?${params}`);
      const results = response.ok ? await response.json() : [];
      if (request !== referenceRequest) return;
      referenceResults = Array.isArray(results) ? results : [];
      autocompleteIndex = 0;
    } catch {
      if (request === referenceRequest) {
        referenceResults = [];
        autocompleteIndex = 0;
      }
    }
  }

  function handleInput(e: Event) {
    if (!textarea) return;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const textBeforeCursor = val.slice(0, pos);
    const mention = textBeforeCursor.match(/(?:\s|^)@([a-zA-Z0-9_]*)$/);
    if (mention) {
      autocompleteKind = 'user';
      autocompleteQuery = mention[1];
      mentionStart = pos - mention[1].length - 1;
      void searchUsers(autocompleteQuery);
      return;
    }
    if (allowReferences) {
      const reference = textBeforeCursor.match(/(?:^|\s)(#{1,2}[a-z0-9-]*(?:\/\d*)?)$/);
      if (reference) {
        autocompleteKind = 'reference';
        referenceStart = pos - reference[1].length;
        void searchReferences(reference[1]);
        return;
      }
    }
    autocompleteKind = null;
  }

  // @wc-ignore
  const KEYS = {
    ARROW_DOWN: 'ArrowDown',
    ARROW_UP: 'ArrowUp',
    ENTER: 'Enter',
    ESCAPE: 'Escape',
    TAB: 'Tab'
  };

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === KEYS.ENTER && !e.isComposing) {
      const form = textarea?.closest('form');
      const submit = form?.querySelector<HTMLButtonElement>(
        'button:not([type]), button[type="submit"]'
      );
      if (form && submit && !submit.disabled) {
        e.preventDefault();
        form.requestSubmit(submit);
      }
      return;
    }
    if (!autocompleteKind) return;
    const results = autocompleteKind === 'user' ? autocompleteResults : referenceResults;
    if (!results.length) {
      if (e.key === KEYS.ESCAPE) autocompleteKind = null;
      return;
    }
    if (e.key === KEYS.ARROW_DOWN) {
      e.preventDefault();
      autocompleteIndex = (autocompleteIndex + 1) % results.length;
    } else if (e.key === KEYS.ARROW_UP) {
      e.preventDefault();
      autocompleteIndex = (autocompleteIndex - 1 + results.length) % results.length;
    } else if (e.key === KEYS.ENTER || e.key === KEYS.TAB) {
      e.preventDefault();
      if (autocompleteKind === 'user') insertMention(autocompleteResults[autocompleteIndex]!);
      else insertReference(referenceResults[autocompleteIndex]!);
    } else if (e.key === KEYS.ESCAPE) {
      autocompleteKind = null;
    }
  }

  function insertMention(user: User) {
    if (!textarea) return;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const before = val.slice(0, mentionStart);
    const after = val.slice(pos);
    const displayName = user.nickname ? `@${user.nickname}` : `@${user.name}`;
    const mention = `[${displayName}](/members/${user.id})`;
    value = before + mention + ' ' + after;
    autocompleteKind = null;
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = mentionStart + mention.length + 1;
        textarea.focus();
      }
    }, 0);
  }

  function insertReference(reference: Reference) {
    if (!textarea) return;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const before = val.slice(0, referenceStart);
    const after = val.slice(pos);
    const inserted = `${reference.reference} `;
    value = before + inserted + after;
    autocompleteKind = null;
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = referenceStart + inserted.length;
        textarea.focus();
      }
    }, 0);
  }
</script>

<div class="editor">
  <div class="editor-toolbar">
    <div class="editor-tabs" role="group" aria-label={'Editor mode'}>
      <button
        type="button"
        class:active={!preview}
        aria-pressed={!preview}
        onclick={() => (preview = false)}
        ><Pencil size={14} aria-hidden="true" />{labels.write}</button
      >
      <button
        type="button"
        class:active={preview}
        aria-pressed={preview}
        onclick={() => (preview = true)}
        ><Eye size={14} aria-hidden="true" />{labels.preview}</button
      >
    </div>
    <div class="editor-tools">
      <button type="button" disabled={busy} onclick={() => input?.click()} title={labels.drop}
        ><Paperclip size={14} aria-hidden="true" />{labels.attachments}</button
      >
      {#if allowGallery}<button
          type="button"
          class="gallery-button"
          disabled={busy}
          aria-expanded={activeGallery === 'draft'}
          onclick={beginGallery}><Images size={14} aria-hidden="true" />{labels.gallery}</button
        >{/if}
    </div>
  </div>
  {#if preview}<div class="editor-preview">
      <MarkdownContent
        {value}
        {language}
        {allowReferences}
        onresize={(index, width) => (value = resizeMarkdownImage(value, index, width))}
      />
    </div>
  {:else}<div class="textarea-wrapper">
      <label for={uid} class="sr-only">Markdown</label><textarea
        id={uid}
        bind:this={textarea}
        bind:value
        {rows}
        placeholder={labels.placeholder}
        class:dragging
        aria-describedby={`${uid}-drop`}
        ondragover={(event) => {
          if (!event.dataTransfer?.types.includes('Files')) return;
          event.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={(event) => {
          if (!event.dataTransfer?.types.includes('Files')) return;
          event.preventDefault();
          dragging = false;
          void upload(event.dataTransfer.files, 'content');
        }}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onclick={() => (autocompleteKind = null)}
      ></textarea>
      {#if autocompleteKind === 'user' && autocompleteResults.length > 0}
        <div class="autocomplete-dropdown">
          {#each autocompleteResults as user, i}
            <button
              type="button"
              class="autocomplete-item"
              class:selected={i === autocompleteIndex}
              onclick={() => insertMention(user)}
              onmouseenter={() => (autocompleteIndex = i)}
            >
              {#if user.image}
                <img src={user.image} alt={user.name} class="avatar" />
              {/if}
              <div class="user-info">
                <span class="name">{user.name}</span>
                {#if user.nickname}
                  <span class="nickname">@{user.nickname}</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {:else if autocompleteKind === 'reference' && referenceResults.length > 0}
        <div class="autocomplete-dropdown reference-dropdown">
          {#each referenceResults as result, i}
            <button
              type="button"
              class="autocomplete-item reference-item"
              class:selected={i === autocompleteIndex}
              onclick={() => insertReference(result)}
              onmouseenter={() => (autocompleteIndex = i)}
            >
              <span class="reference-number">{result.reference}</span>
              <span class="reference-info">
                <span class="reference-title">{result.title}</span>
                <span class="reference-meta">
                  {result.type === 'item' ? labels.referenceTask : labels.referenceThread} ·
                  {result.scopeLabel ?? labels.referenceAssociation}{#if result.archived}
                    · {labels.referenceArchived}{/if}
                </span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>{/if}
  <input
    bind:this={input}
    class="file-input"
    type="file"
    multiple
    disabled={busy}
    onchange={(event) => upload(event.currentTarget.files)}
    tabindex="-1"
    aria-hidden="true"
  />
  <p class="upload-hint" id={`${uid}-drop`}>
    {busy ? labels.uploading : labels.drop}{#if allowReferences}
      <span class="hint-separator">·</span> {labels.referenceHint}{/if}
  </p>
  {#if uploadTarget === 'content' && pendingUploads.length}
    <ul class="pending-uploads" aria-live="polite">
      {#each pendingUploads as upload (upload.key)}<li>
          <span class="upload-spinner"><LoaderCircle size={18} aria-hidden="true" /></span><span
            >{upload.status === 'uploading' ? labels.uploading : labels.queued}<small
              >{upload.name}</small
            ></span
          >
        </li>{/each}
    </ul>
  {/if}
  {#if allowGallery && !preview}
    {#each galleries as gallery, index (index)}
      <section class="gallery-section">
        <button
          id={`${uid}-gallery-${index}-summary`}
          type="button"
          class="gallery-summary"
          class:expanded={activeGallery === index}
          disabled={busy}
          aria-expanded={activeGallery === index}
          aria-controls={`${uid}-gallery-${index}`}
          onclick={() => (activeGallery = activeGallery === index ? null : index)}
        >
          <Images size={16} aria-hidden="true" />
          <span class="gallery-summary-title">{labels.galleryName} {index + 1}</span>
          <span class="gallery-summary-count"
            >{labels.images}: {gallery.ids.length} · {labels.preview}: {gallery.preview}</span
          >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <div id={`${uid}-gallery-${index}`} hidden={activeGallery !== index}>
          {#if activeGallery === index}
            <GalleryEditor
              {gallery}
              {language}
              {busy}
              names={imageNames}
              uploads={uploadTarget === index ? pendingUploads : []}
              onchange={(state) => changeGallery(index, state)}
              onupload={(files) => void upload(files, index)}
              onremove={() => changeGallery(index, { ids: [], preview: 0 })}
            />
          {/if}
        </div>
      </section>
    {/each}
    {#if galleryPicker}
      <section class="gallery-section">
        <button
          id={`${uid}-gallery-draft-summary`}
          type="button"
          class="gallery-summary"
          class:expanded={activeGallery === 'draft'}
          disabled={busy}
          aria-expanded={activeGallery === 'draft'}
          aria-controls={`${uid}-gallery-draft`}
          onclick={() => (activeGallery = activeGallery === 'draft' ? null : 'draft')}
        >
          <Images size={16} aria-hidden="true" />
          <span class="gallery-summary-title">{labels.newGallery}</span>
          <span class="gallery-summary-count"
            >{labels.images}: {galleryDraft.ids.length} · {labels.preview}: {galleryDraft.preview}</span
          >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <div id={`${uid}-gallery-draft`} hidden={activeGallery !== 'draft'}>
          {#if activeGallery === 'draft'}
            <GalleryEditor
              gallery={galleryDraft}
              {language}
              {busy}
              names={imageNames}
              uploads={uploadTarget === 'draft' ? pendingUploads : []}
              onchange={(state) => (galleryDraft = state)}
              onupload={(files) => void upload(files, 'draft')}
              onremove={() => {
                galleryPicker = false;
                galleryDraft = { ids: [], preview: 0 };
                activeGallery = null;
              }}
            />
            <button
              class="insert-gallery"
              type="button"
              disabled={busy || !galleryDraft.ids.length}
              onclick={insertGallery}>{labels.insert}</button
            >
          {/if}
        </div>
      </section>
    {/if}
  {/if}
  {#if message}<p role="alert" class="error">{message}</p>{/if}
</div>

<style>
  .gallery-section {
    min-width: 0;
  }
  .editor .gallery-summary {
    display: flex;
    width: 100%;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--surface);
    text-align: left;
    color: var(--ink);
  }
  .gallery-summary-title {
    flex: 1;
    font-weight: 600;
  }
  .gallery-summary-count {
    color: var(--muted);
    font-size: 11px;
  }
  .gallery-summary :global(svg) {
    flex-shrink: 0;
  }
  .gallery-summary :global(svg:last-child) {
    transition: transform 150ms ease;
  }
  .gallery-summary.expanded :global(svg:last-child) {
    transform: rotate(180deg);
  }
  .gallery-section .insert-gallery {
    margin-top: 12px;
  }
  @media (max-width: 540px) {
    .editor .gallery-summary {
      flex-wrap: wrap;
    }
    .gallery-summary-count {
      order: 1;
      flex-basis: 100%;
      margin-left: 26px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .gallery-summary :global(svg:last-child) {
      transition: none;
    }
  }
  .pending-uploads {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  .pending-uploads li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px dashed var(--line);
    color: var(--muted);
    font-size: 12px;
  }
  .pending-uploads small {
    display: block;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }
  .upload-spinner {
    display: inline-flex;
    flex-shrink: 0;
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
  .editor {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .editor-tabs {
    display: flex;
    gap: 2px;
  }
  .editor button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    color: var(--muted);
    padding: 7px 9px;
    font-size: 12px;
    cursor: pointer;
  }
  .editor button:hover {
    border-color: var(--control-border-hover, var(--line));
    color: var(--ink);
  }
  .editor button.active {
    background: var(--surface-muted);
    border-color: var(--line);
    color: var(--ink);
  }
  .editor textarea {
    width: 100%;
    min-height: 130px;
    margin: 0;
    resize: vertical;
  }
  .editor-preview {
    min-height: 160px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 3px;
    overflow-wrap: anywhere;
  }
  .file-input {
    display: none;
  }
  .editor-tools {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .editor textarea.dragging {
    border-color: var(--accent);
    outline: 2px dashed var(--accent);
    outline-offset: -5px;
    background: var(--surface-muted);
  }
  .upload-hint {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }
  .editor .insert-gallery {
    justify-self: start;
    border-color: var(--line);
    padding: 9px 12px;
  }
  .editor button:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .textarea-wrapper {
    position: relative;
    width: 100%;
  }
  .autocomplete-dropdown {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    max-height: 200px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
    overflow-y: auto;
    z-index: 50;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    width: 250px;
  }
  .autocomplete-dropdown.reference-dropdown {
    width: min(360px, calc(100vw - 48px));
  }
  .autocomplete-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    border-bottom: 1px solid var(--line);
  }
  .autocomplete-item:last-child {
    border-bottom: none;
  }
  .autocomplete-item.selected,
  .autocomplete-item:hover {
    background: var(--surface-muted);
  }
  .autocomplete-item.reference-item {
    align-items: flex-start;
  }
  .autocomplete-item .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }
  .autocomplete-item .user-info {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 6px;
  }
  .autocomplete-item .name {
    font-weight: 500;
    color: var(--ink);
  }
  .autocomplete-item .nickname {
    font-size: 11px;
    color: var(--muted);
  }
  .autocomplete-item .reference-number {
    flex: 0 0 auto;
    padding: 2px 6px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--surface-muted);
    color: var(--accent);
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.4;
  }
  .autocomplete-item .reference-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .autocomplete-item .reference-title {
    overflow: hidden;
    color: var(--ink);
    font-size: 12px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .autocomplete-item .reference-meta {
    overflow: hidden;
    color: var(--muted);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hint-separator {
    color: var(--line);
  }
</style>
