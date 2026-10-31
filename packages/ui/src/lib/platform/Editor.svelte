<script lang="ts">
  import { rebaseTextRange, type TextRange } from 'shared/markdown-edit';
  import { preferences } from './preferences.svelte.js';
  import { slider } from './slider.js';
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
  import { page } from '$app/state';
  import { contentLocale, type ContentLocale } from 'shared/content-locales';
  import { referenceScopeForPath } from 'shared/markdown-references';
  import {
    Eye,
    Pencil,
    Images,
    Paperclip,
    LoaderCircle,
    ChevronDown,
    FileText
  } from '@lucide/svelte';
  let {
    value = $bindable(''),
    rows = 10,
    allowGallery = false,
    allowReferences = false,
    docs = false,
    docLocale,
    referenceScope
  }: {
    value?: string;
    rows?: number;
    allowGallery?: boolean;
    allowReferences?: boolean;
    /** Suggests documentation pages after `[` and previews page links. */
    docs?: boolean;
    docLocale?: ContentLocale;
    referenceScope?: string;
  } = $props();
  const language = $derived(preferences.language);
  const uid = $props.id();
  const labels = $derived({
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
    referenceEmpty: 'Brak pasujących zadań lub wątków.',
    docHint: 'Wpisz [, aby podlinkować stronę dokumentacji.',
    docPage: 'Strona',
    docSection: 'Sekcja'
  });

  let message = $state(''),
    preview = $state(false),
    busy = $state(false),
    dragging = $state(false);
  let input = $state<HTMLInputElement>();
  let galleryPicker = $state(false);
  let activeGallery = $state<number | 'draft' | null>(null);
  type UploadTarget = 'content' | 'draft' | number;
  let pendingUploads = $state<
    { key: number; name: string; target: UploadTarget; status: 'queued' | 'uploading' }[]
  >([]);
  const contentUploads = $derived(pendingUploads.filter((upload) => upload.target === 'content'));
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
  type Insertion = TextRange & { source: string };
  type Upload = {
    key: number;
    file: File;
    target: UploadTarget;
    insertion?: Insertion;
  };
  const uploadQueue: Upload[] = [];
  const insertions = new Set<Insertion>();
  let nextUploadKey = 0;

  function trackInsertions(source: string) {
    for (const insertion of insertions) {
      Object.assign(insertion, rebaseTextRange(insertion.source, source, insertion), { source });
    }
  }
  $effect(() => trackInsertions(value));

  function insertUpload(markdown: string, insertion: Insertion) {
    trackInsertions(value);
    const before = value;
    const range = { start: insertion.start, end: insertion.end };
    const next = before.slice(0, insertion.start) + markdown + before.slice(insertion.end);
    const selection = textarea
      ? rebaseTextRange(
          before,
          next,
          {
            start: textarea.selectionStart,
            end: textarea.selectionEnd
          },
          range
        )
      : null;
    for (const pending of insertions)
      Object.assign(pending, rebaseTextRange(before, next, pending, range), { source: next });
    value = next;
    if (textarea && selection) {
      // Update immediately so an input event before the next render sees the new
      // value. Preserve a moved caret and never steal focus from another field.
      textarea.value = next;
      textarea.setSelectionRange(selection.start, selection.end);
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const clipboard = event.clipboardData;
    if (!clipboard || !textarea) return;
    const images = Array.from(clipboard.files).filter((file) => file.type.startsWith('image/'));
    if (!images.length)
      for (const item of Array.from(clipboard.items)) {
        if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (file) images.push(file);
      }
    if (!images.length) return;
    event.preventDefault();
    autocompleteKind = null;
    const insertion = {
      source: value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
    insertions.add(insertion);
    void upload(images, 'content', insertion);
  }

  async function upload(
    files: FileList | File[] | null,
    target: UploadTarget = 'content',
    insertion?: Insertion
  ) {
    if (!files?.length) return;
    if (!busy) message = '';
    const uploads = Array.from(files).filter((file) => {
      if (
        target === 'content' ||
        ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)
      )
        return true;
      message = labels.imagesOnly;
      return false;
    });
    const queued = uploads.map((file) => ({ key: nextUploadKey++, file, target, insertion }));
    uploadQueue.push(...queued);
    pendingUploads = [
      ...pendingUploads,
      ...queued.map(({ key, file, target }) => ({
        key,
        name: file.name,
        target,
        status: 'queued' as const
      }))
    ];
    if (busy) return;
    busy = true;
    try {
      while (uploadQueue.length) {
        const { key, file, target, insertion } = uploadQueue.shift()!;
        pendingUploads = pendingUploads.map((upload) =>
          upload.key === key ? { ...upload, status: 'uploading' } : upload
        );
        try {
          const body = new FormData();
          body.set('file', file);
          const response = await fetch('/api/files', { method: 'POST', body });
          const data = await response.json();
          if (!response.ok)
            throw new Error(`${file.name}: ${data.code ?? 'Nie udało się przesłać pliku.'}`);
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
            const markdown = `\n${file.type.startsWith('image/') ? '!' : ''}[${file.name.replace(/[[\]\\]/g, '_')}](file:${data.id})\n`;
            if (insertion) insertUpload(markdown, insertion);
            else value += markdown;
          }
        } catch (error) {
          message = error instanceof Error ? error.message : 'Nie udało się przesłać pliku.';
        } finally {
          pendingUploads = pendingUploads.filter((upload) => upload.key !== key);
          if (insertion && !uploadQueue.some((upload) => upload.insertion === insertion))
            insertions.delete(insertion);
        }
      }
    } finally {
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
  type DocSuggestion = { reference: string; title: string; context: string | null; level: number };
  let textarea: HTMLTextAreaElement | undefined = $state();
  let autocompleteKind = $state<'user' | 'reference' | 'doc' | null>(null);
  let docResults = $state<DocSuggestion[]>([]);
  let docStart = $state(0);
  let docRequest = 0;
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
    return referenceScopeForPath(page.url.pathname);
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

  async function searchDocs(q: string) {
    const request = ++docRequest;
    const params = new URLSearchParams({
      q,
      scope: currentReferenceScope(),
      locale: docLocale ?? contentLocale(language)
    });
    try {
      const response = await fetch(`/api/platform/docs/search?${params}`);
      const results = response.ok ? await response.json() : [];
      if (request !== docRequest) return;
      docResults = Array.isArray(results) ? results : [];
      autocompleteIndex = 0;
    } catch {
      if (request === docRequest) {
        docResults = [];
        autocompleteIndex = 0;
      }
    }
  }

  let pendingInput: { source: string; range: TextRange; type: string } | undefined;
  function handleBeforeInput(event: InputEvent) {
    if (!textarea) return;
    pendingInput = {
      source: textarea.value,
      range: { start: textarea.selectionStart, end: textarea.selectionEnd },
      type: event.inputType
    };
  }

  function handleInput(e: Event) {
    if (!textarea) return;
    const val = textarea.value;
    if (pendingInput) {
      const { source, range, type } = pendingInput;
      const removed = source.length - val.length;
      if (range.start === range.end && removed > 0) {
        if (type.endsWith('Backward')) range.start -= removed;
        else if (type.endsWith('Forward')) range.end += removed;
      }
      trackInsertions(source);
      for (const insertion of insertions)
        Object.assign(insertion, rebaseTextRange(source, val, insertion, range), { source: val });
      pendingInput = undefined;
    } else trackInsertions(val);
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
    if (docs) {
      const page = textBeforeCursor.match(/(?:^|[^!\\\]])\[([^[\]\n\s][^[\]\n]{0,80})?$/);
      // A bracket opening a task list item is a checkbox, not a page link.
      if (page && !/(?:^|\n)\s*(?:[-*+]|\d+[.)])\s+\[[xX]?$/.test(textBeforeCursor)) {
        autocompleteKind = 'doc';
        docStart = pos - (page[1]?.length ?? 0) - 1;
        void searchDocs(page[1] ?? '');
        return;
      }
    }
    if (allowReferences || docs) {
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
    const results =
      autocompleteKind === 'user'
        ? autocompleteResults
        : autocompleteKind === 'doc'
          ? docResults
          : referenceResults;
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
      else if (autocompleteKind === 'doc') insertDocLink(docResults[autocompleteIndex]!);
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

  function insertDocLink(page: DocSuggestion) {
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const before = value.slice(0, docStart);
    // Replace a closing bracket typed earlier instead of doubling it.
    const after = value.slice(pos).replace(/^[^[\]\n\s]*\]/, '');
    const inserted = `[${page.reference}]`;
    value = before + inserted + after;
    autocompleteKind = null;
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = docStart + inserted.length;
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
    <div class="editor-tabs" role="group" aria-label={'Tryb edytora'} use:slider>
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
        {allowReferences}
        {docs}
        {docLocale}
        {referenceScope}
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
        onbeforeinput={handleBeforeInput}
        onpaste={handlePaste}
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
      {:else if autocompleteKind === 'doc' && docResults.length > 0}
        <div class="autocomplete-dropdown reference-dropdown">
          {#each docResults as result, i (result.reference)}
            <button
              type="button"
              class="autocomplete-item reference-item"
              class:selected={i === autocompleteIndex}
              onclick={() => insertDocLink(result)}
              onmouseenter={() => (autocompleteIndex = i)}
            >
              <span class="reference-number"
                >{#if result.level}H{result.level}{:else}<FileText
                    size={11}
                    aria-hidden="true"
                  />{/if}</span
              >
              <span class="reference-info">
                <span class="reference-title">{result.title}</span>
                <span class="reference-meta">
                  {result.level ? labels.docSection : labels.docPage} ·
                  {result.context ?? labels.referenceAssociation} · {result.reference}
                </span>
              </span>
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
    {busy ? labels.uploading : labels.drop}{#if allowReferences || docs}
      <span class="hint-separator">·</span> {labels.referenceHint}{/if}{#if docs}
      <span class="hint-separator">·</span> {labels.docHint}{/if}
  </p>
  {#if contentUploads.length}
    <ul class="pending-uploads" aria-live="polite">
      {#each contentUploads as upload (upload.key)}<li>
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
              {busy}
              names={imageNames}
              uploads={pendingUploads.filter((upload) => upload.target === index)}
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
              {busy}
              names={imageNames}
              uploads={pendingUploads.filter((upload) => upload.target === 'draft')}
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
    border-radius: var(--radius-lg, 8px);
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
    grid-template-columns: minmax(0, 1fr);
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
    padding: 3px;
    border-radius: var(--radius-lg, 8px);
    background: var(--surface-muted);
  }
  .editor button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-md, 6px);
    background: transparent;
    color: var(--muted);
    padding: 6px 9px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--dur-fast, 120ms) ease,
      color var(--dur-fast, 120ms) ease,
      box-shadow var(--dur-fast, 120ms) ease;
  }
  .editor button:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  .editor-tabs button {
    padding: 4px 10px;
  }
  .editor-tabs button:hover {
    background: transparent;
  }
  .editor button.active {
    color: var(--ink);
  }
  .editor-tabs button.active {
    background: transparent;
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
    border-radius: var(--radius-md, 6px);
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
    border-color: var(--input, var(--line));
    padding: 7px 12px;
    background: var(--surface);
    box-shadow: var(--shadow-xs, none);
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
    border-radius: var(--radius-lg, 8px);
    padding: 4px;
    overflow-y: auto;
    z-index: 50;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
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
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius-sm, 4px);
    background: transparent;
    cursor: pointer;
    text-align: left;
    width: 100%;
    line-height: 1.2;
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
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  }
  .autocomplete-item .user-info {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 4px;
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
    padding: 1px 5px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm, 4px);
    background: var(--surface-muted);
    color: var(--accent);
    font-family: var(--mono);
    font-size: 10px;
    line-height: 1.3;
  }
  .autocomplete-item .reference-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .autocomplete-item .reference-title {
    overflow: hidden;
    color: var(--ink);
    font-size: 11px;
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
