<script lang="ts">
  import { insertMarkdownGallery } from 'shared/markdown-gallery';
  import { markdownImages } from 'shared/markdown-images';
  import { resizeMarkdownImage } from 'shared/markdown-images';
  import MarkdownContent from './MarkdownContent.svelte';
  import { Eye, Pencil, Images, UploadCloud, Paperclip } from '@lucide/svelte';
  let {
    value = $bindable(''),
    language = 'pl',
    rows = 10,
    allowGallery = false
  }: { value?: string; language?: 'pl' | 'en'; rows?: number; allowGallery?: boolean } = $props();
  const uid = $props.id();
  const labels = $derived(
    language === 'pl'
      ? {
          write: 'Edytuj',
          preview: 'Podgląd',
          gallery: 'Galeria',
          placeholder: 'Napisz treść w Markdown…',
          attachments: 'Przeciągnij pliki tutaj lub wybierz załączniki'
        }
      : {
          write: 'Write',
          preview: 'Preview',
          gallery: 'Gallery',
          placeholder: 'Write a Markdown description…',
          attachments: 'Drop files here or choose attachments'
        }
  );

  let message = $state(''),
    preview = $state(false),
    busy = $state(false),
    dragging = $state(false);
  let input = $state<HTMLInputElement>();
  let galleryPicker = $state(false);
  let gallerySelection = $state<string[]>([]);
  let uploadedImages = $state<{ id: string; name: string }[]>([]);
  let galleryPreview = $state(3);
  const galleryImages = $derived([
    ...new Map(
      [
        ...markdownImages(value).flatMap((image) => {
          const match = image.href.match(/^file:([A-Za-z0-9_-]{8,64})$/);
          return match ? [{ id: match[1], name: image.text }] : [];
        }),
        ...uploadedImages
      ].map((image) => [image.id, image])
    ).values()
  ]);
  function insertGallery() {
    value = insertMarkdownGallery(value, gallerySelection, galleryPreview);
    galleryPicker = false;
    gallerySelection = [];
    preview = false;
  }
  async function upload(files: FileList | File[] | null) {
    if (!files?.length || busy) return;
    busy = true;
    message = '';
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set('file', file);
        const response = await fetch('/api/files', { method: 'POST', body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.code ?? 'Upload failed.');
        if (file.type.startsWith('image/')) {
          uploadedImages = [...uploadedImages, { id: data.id, name: file.name }];
          if (galleryPicker) {
            gallerySelection = [...gallerySelection, data.id];
            continue;
          }
        }
        value += `\n${file.type.startsWith('image/') ? '!' : ''}[${file.name.replace(/[[\]\\]/g, '_')}](file:${data.id})\n`;
      }
    } catch (error) {
      message = error instanceof Error ? error.message : 'Upload failed.';
    } finally {
      busy = false;
      if (input) input.value = '';
    }
  }

  type User = { id: string; name: string; nickname: string | null; image: string | null };
  let textarea: HTMLTextAreaElement | undefined = $state();
  let showAutocomplete = $state(false);
  let autocompleteQuery = $state('');
  let autocompleteResults = $state<User[]>([]);
  let autocompleteIndex = $state(0);
  let mentionStart = $state(0);

  async function searchUsers(q: string) {
    if (!q) {
      autocompleteResults = [];
      return;
    }
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (response.ok) autocompleteResults = await response.json();
      else autocompleteResults = [];
    } catch {
      autocompleteResults = [];
    }
  }

  function handleInput(e: Event) {
    if (!textarea) return;
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/(?:\s|^)@([a-zA-Z0-9_]*)$/);
    if (match) {
      showAutocomplete = true;
      autocompleteQuery = match[1];
      mentionStart = pos - match[1].length - 1;
      void searchUsers(autocompleteQuery);
    } else {
      showAutocomplete = false;
    }
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
    if (!showAutocomplete) return;
    if (e.key === KEYS.ARROW_DOWN) {
      e.preventDefault();
      autocompleteIndex = (autocompleteIndex + 1) % autocompleteResults.length;
    } else if (e.key === KEYS.ARROW_UP) {
      e.preventDefault();
      autocompleteIndex =
        (autocompleteIndex - 1 + autocompleteResults.length) % autocompleteResults.length;
    } else if (e.key === KEYS.ENTER || e.key === KEYS.TAB) {
      e.preventDefault();
      if (autocompleteResults.length > 0) {
        insertMention(autocompleteResults[autocompleteIndex]);
      }
    } else if (e.key === KEYS.ESCAPE) {
      showAutocomplete = false;
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
    showAutocomplete = false;
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = mentionStart + mention.length + 1;
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
    {#if allowGallery}<button
        type="button"
        class="gallery-button"
        onclick={() => {
          galleryPicker = !galleryPicker;
          gallerySelection = galleryImages.map((image) => image.id);
        }}><Images size={14} aria-hidden="true" />{labels.gallery}</button
      >{/if}
  </div>
  {#if allowGallery && galleryPicker}<fieldset class="gallery-picker">
      <legend>{language === 'pl' ? 'Wybierz zdjęcia do galerii' : 'Choose gallery images'}</legend>
      {#each galleryImages as image (image.id)}<label class="gallery-choice">
          <input type="checkbox" value={image.id} bind:group={gallerySelection} />
          <img src={`/media/${image.id}`} alt="" />{image.name}
        </label>{/each}
      {#if !galleryImages.length}<p>
          {language === 'pl'
            ? 'Dodaj zdjęcia za pomocą przycisku załączników poniżej.'
            : 'Upload images using the attachments button below.'}
        </p>{/if}
      <label
        >{language === 'pl' ? 'Liczba zdjęć w podglądzie' : 'Preview image count'}<input
          type="number"
          min="1"
          max="30"
          bind:value={galleryPreview}
        /></label
      >
      <button type="button" disabled={busy || !gallerySelection.length} onclick={insertGallery}
        >{language === 'pl' ? 'Wstaw galerię' : 'Insert gallery'}</button
      >
    </fieldset>{/if}
  {#if preview}<div class="editor-preview">
      <MarkdownContent
        {value}
        {language}
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
        oninput={handleInput}
        onkeydown={handleKeyDown}
        onclick={() => (showAutocomplete = false)}
      ></textarea>
      {#if showAutocomplete && autocompleteResults.length > 0}
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
  <button
    type="button"
    class="upload-zone"
    class:dragging
    disabled={busy}
    onclick={() => input?.click()}
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={(event) => {
      event.preventDefault();
      dragging = false;
      void upload(event.dataTransfer?.files ?? null);
    }}
  >
    {#if busy}<UploadCloud size={18} aria-hidden="true" />{'Uploading…'}{:else}<Paperclip
        size={17}
        aria-hidden="true"
      /><span>{labels.attachments}</span>{/if}
  </button>
  {#if message}<p role="alert" class="error">{message}</p>{/if}
</div>

<style>
  .gallery-picker {
    display: grid;
    gap: 12px;
    border: 1px solid var(--line);
    padding: 16px;
  }
  .gallery-choice {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .gallery-choice img {
    width: 64px;
    height: 48px;
    object-fit: cover;
  }
  .gallery-choice input {
    width: auto;
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
  .editor .upload-zone {
    width: 100%;
    justify-content: center;
    border: 1px dashed var(--line);
    padding: 18px 12px;
    line-height: 1.5;
    text-align: center;
  }
  .editor .upload-zone:hover,
  .editor .upload-zone.dragging {
    border-color: var(--accent);
    background: var(--surface-muted);
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
</style>
