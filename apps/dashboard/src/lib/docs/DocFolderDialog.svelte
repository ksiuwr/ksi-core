<script lang="ts">
  import { docFolderName, type DocFolder } from 'shared/doc-folders';
  import { contentLocaleName } from 'shared/content-locales';
  import type { ContentLocale } from 'shared/content-locales';
  import ContentLocaleEditor from '$lib/ContentLocaleEditor.svelte';
  import { Trash2 } from '@lucide/svelte';
  import DocFolderSelect from './DocFolderSelect.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { docsRequest, errorCode } from './docs';
  import DocError from './DocError.svelte';

  let {
    open,
    projectId,
    folders,
    folder = null,
    parentId = null,
    pages = [],
    onclose,
    onsaved,
    ondeleted
  }: {
    open: boolean;
    projectId: string;
    folders: DocFolder[];
    folder?: DocFolder | null;
    parentId?: string | null;
    pages?: { folderId: string | null }[];
    onclose: () => void;
    onsaved: (folder: DocFolder) => void | Promise<void>;
    ondeleted?: () => void | Promise<void>;
  } = $props();
  const uid = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let names = $state<Record<ContentLocale, string>>({ en: '', pl: '' });
  let editing = $state<ContentLocale>('en');
  let parent = $state('');
  let busy = $state(false);
  let error = $state('');
  let confirmingDelete = $state(false);
  const hasContents = $derived(
    !!folder &&
      (folders.some((item) => item.parentId === folder.id) ||
        pages.some((page) => page.folderId === folder.id))
  );
  const dirty = $derived(
    names[editing] !==
      (editing === 'en' ? (folder?.name ?? '') : (folder?.translations[editing]?.name ?? ''))
  );
  const added = $derived<ContentLocale[]>(names.pl.trim() ? ['pl'] : []);

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      names = { en: folder?.name ?? '', pl: folder?.translations.pl?.name ?? '' };
      editing = 'en';
      parent = (folder ? folder.parentId : parentId) ?? '';
      error = '';
      confirmingDelete = false;
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy || !names.en.trim() || confirmingDelete) return;
    busy = true;
    error = '';
    try {
      const result = await docsRequest<DocFolder>(
        folder ? `/docs/folders/${folder.id}` : '/docs/folders',
        folder ? 'PUT' : 'POST',
        {
          ...(folder || !projectId ? {} : { projectId }),
          name: names.en.trim(),
          parentId: parent || null,
          translations: names.pl.trim() ? { pl: { name: names.pl.trim() } } : {}
        }
      );
      await onsaved(result);
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }
  async function remove() {
    if (!folder || busy || hasContents) return;
    busy = true;
    error = '';
    try {
      await docsRequest(`/docs/folders/${folder.id}`, 'DELETE');
      await ondeleted?.();
      onclose();
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="folder-dialog"
  aria-labelledby={`${uid}-title`}
  oncancel={(event) => {
    event.preventDefault();
    if (!busy) onclose();
  }}
>
  <form onsubmit={save}>
    <h2 id={`${uid}-title`}>
      {#if confirmingDelete}{'Delete folder?'}{:else if folder}{'Edit folder'}{:else}{'New folder'}{/if}
    </h2>
    <DocError code={error} />
    {#if confirmingDelete && folder}
      <p class="delete-summary">
        {`Delete folder “${docFolderName(folder, preferences.language)}”?`}
      </p>
      {#if hasContents}<p class="delete-note">
          {'Move pages and subfolders out before deleting this folder.'}
        </p>
      {:else}<p class="delete-note">
          {'This cannot be undone. Existing version history will be preserved.'}
        </p>{/if}
      <div class="folder-actions">
        <button
          type="button"
          class="btn btn-outline"
          disabled={busy}
          onclick={() => {
            confirmingDelete = false;
            error = '';
          }}>{'Cancel'}</button
        >
        <button
          type="button"
          class="btn danger-button"
          disabled={busy || hasContents}
          onclick={remove}><Trash2 size={15} aria-hidden="true" />{'Delete folder'}</button
        >
      </div>
    {:else}
      <ContentLocaleEditor
        bind:selected={editing}
        {added}
        {dirty}
        {busy}
        saveHint={'All language versions are saved together with the folder.'}
        onremove={() => {
          if (editing !== 'en') names[editing] = '';
        }}
      >
        {#snippet reference()}<p class="folder-reference" lang="en">
            {names.en || 'No content'}
          </p>{/snippet}
      </ContentLocaleEditor>
      <div>
        <label for={`${uid}-name`}
          >{'Folder name'} · {contentLocaleName(editing, preferences.language)}</label
        >
        <input
          id={`${uid}-name`}
          bind:value={names[editing]}
          required={editing === 'en'}
          maxlength="80"
          pattern="[^\/]+"
          placeholder={editing === 'en' ? '' : names.en}
          disabled={busy}
        />
      </div>
      <div>
        <label for={`${uid}-parent`}>{'Parent folder'}</label>
        <DocFolderSelect
          id={`${uid}-parent`}
          bind:value={parent}
          {folders}
          label={'Parent folder'}
          locale={preferences.language}
          excludeId={folder?.id}
          disabled={busy}
        />
      </div>
      <div class="folder-actions">
        {#if folder}<button
            type="button"
            class="btn ghost delete-folder"
            disabled={busy}
            onclick={() => {
              confirmingDelete = true;
              error = '';
            }}><Trash2 size={15} aria-hidden="true" />{'Delete folder'}</button
          >{/if}
        <button type="button" class="btn btn-outline" disabled={busy} onclick={onclose}
          >{'Cancel'}</button
        >
        <button class="btn" disabled={busy || !names.en.trim()}
          >{#if folder}{'Save changes'}{:else}{'Create folder'}{/if}</button
        >
      </div>
    {/if}
  </form>
</dialog>

<style>
  .folder-dialog {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-lg);
  }
  .folder-dialog::backdrop {
    background: rgb(12 13 15 / 0.42);
    backdrop-filter: blur(2px);
  }
  form {
    display: grid;
    gap: 18px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .folder-reference {
    padding: 12px;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 13px;
  }
  .folder-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .delete-folder {
    margin-right: auto;
    color: var(--danger);
  }
  .delete-summary {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 14px;
  }
  .delete-note {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
</style>
