<script lang="ts">
  import { docFolderName, type DocFolder } from 'shared/doc-folders';
  import {
    contentLocaleName,
    contentLocales,
    primaryContentLocale,
    translationLocales,
    type ContentLocale
  } from 'shared/content-locales';
  import ContentLocaleEditor from '$lib/ContentLocaleEditor.svelte';
  import { Trash2 } from '@lucide/svelte';
  import DocFolderSelect from './DocFolderSelect.svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { docsRequest, errorCode } from './docs';
  import DocError from './DocError.svelte';
  import {
    Button,
    Dialog,
    DialogHeader,
    HStack,
    Icon,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';

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
  const savedNames = (): Record<ContentLocale, string> =>
    ({
      [primaryContentLocale]: folder?.name ?? '',
      ...Object.fromEntries(
        translationLocales.map((locale) => [locale, folder?.translations[locale]?.name ?? ''])
      )
    }) as Record<ContentLocale, string>;
  let names = $state(
    Object.fromEntries(contentLocales.map((locale) => [locale, ''])) as Record<
      ContentLocale,
      string
    >
  );
  let editing = $state<ContentLocale>(primaryContentLocale);
  let parent = $state('');
  let busy = $state(false);
  let error = $state('');
  let confirmingDelete = $state(false);
  let wasOpen = false;
  const hasContents = $derived(
    !!folder &&
      (folders.some((item) => item.parentId === folder.id) ||
        pages.some((page) => page.folderId === folder.id))
  );
  const dirty = $derived(names[editing] !== savedNames()[editing]);
  const added = $derived<ContentLocale[]>(
    translationLocales.filter((locale) => names[locale].trim())
  );
  const title = $derived(
    confirmingDelete ? 'Usunąć folder?' : folder ? 'Edytuj folder' : 'Nowy folder'
  );

  $effect(() => {
    if (open && !wasOpen) {
      names = savedNames();
      editing = primaryContentLocale;
      parent = (folder ? folder.parentId : parentId) ?? '';
      error = '';
      confirmingDelete = false;
    }
    wasOpen = open;
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (busy || !names[primaryContentLocale].trim() || confirmingDelete) return;
    busy = true;
    error = '';
    try {
      const result = await docsRequest<DocFolder>(
        folder ? `/docs/folders/${folder.id}` : '/docs/folders',
        folder ? 'PUT' : 'POST',
        {
          ...(folder || !projectId ? {} : { projectId }),
          name: names[primaryContentLocale].trim(),
          parentId: parent || null,
          translations: Object.fromEntries(
            translationLocales
              .filter((locale) => names[locale].trim())
              .map((locale) => [locale, { name: names[locale].trim() }])
          )
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

<Dialog
  isOpen={open}
  onOpenChange={(next) => {
    if (!next && !busy) onclose();
  }}
  purpose="form"
  width={520}
  padding={6}
>
  <VStack gap={4}>
    <DialogHeader {title} hasDivider={false} />
    <DocError code={error} />
    {#if confirmingDelete && folder}
      <Text as="p" class="delete-summary">
        {`Usunąć folder „${docFolderName(folder, preferences.language)}”?`}
      </Text>
      {#if hasContents}
        <Text as="p" type="supporting" class="delete-note">
          Przed usunięciem folderu przenieś z niego strony i podfoldery.
        </Text>
      {:else}
        <Text as="p" type="supporting" class="delete-note">
          Tej czynności nie można cofnąć. Dotychczasowa historia wersji zostanie zachowana.
        </Text>
      {/if}
      <HStack hAlign="end" gap={2} wrap="wrap">
        <Button
          variant="secondary"
          label="Anuluj"
          isDisabled={busy}
          onclick={() => {
            confirmingDelete = false;
            error = '';
          }}
        />
        <Button
          variant="destructive"
          label="Usuń folder"
          isDisabled={busy || hasContents}
          onclick={remove}
        >
          {#snippet icon()}<Icon icon={Trash2} size="sm" />{/snippet}
        </Button>
      </HStack>
    {:else}
      <VStack as="form" gap={4} onsubmit={save}>
        <ContentLocaleEditor
          bind:selected={editing}
          {added}
          {dirty}
          {busy}
          saveHint={'Wszystkie wersje językowe są zapisywane razem z folderem.'}
          onremove={() => {
            if (editing !== primaryContentLocale) names[editing] = '';
          }}
        >
          {#snippet reference()}<p class="folder-reference" lang={primaryContentLocale}>
              {names[primaryContentLocale] || 'Brak treści'}
            </p>{/snippet}
        </ContentLocaleEditor>
        <TextInput
          id={`${uid}-name`}
          label={`Nazwa folderu · ${contentLocaleName(editing, preferences.language)}`}
          value={names[editing]}
          isRequired={editing === primaryContentLocale}
          placeholder={editing === primaryContentLocale ? '' : names[primaryContentLocale]}
          isDisabled={busy}
          onChange={(next) => (names[editing] = next.replaceAll('/', '').slice(0, 80))}
        />
        <DocFolderSelect
          id={`${uid}-parent`}
          bind:value={parent}
          {folders}
          label={'Folder nadrzędny'}
          locale={preferences.language}
          excludeId={folder?.id}
          disabled={busy}
        />
        <HStack hAlign={folder ? 'between' : 'end'} vAlign="center" gap={2} wrap="wrap">
          {#if folder}
            <Button
              variant="ghost"
              label="Usuń folder"
              isDisabled={busy}
              onclick={() => {
                confirmingDelete = true;
                error = '';
              }}
            >
              {#snippet icon()}<Icon icon={Trash2} size="sm" />{/snippet}
            </Button>
          {/if}
          <HStack gap={2} wrap="wrap">
            <Button variant="secondary" label="Anuluj" isDisabled={busy} onclick={onclose} />
            <Button
              type="submit"
              label={folder ? 'Zapisz zmiany' : 'Utwórz folder'}
              isDisabled={busy || !names[primaryContentLocale].trim()}
            />
          </HStack>
        </HStack>
      </VStack>
    {/if}
  </VStack>
</Dialog>

<style>
  .folder-reference {
    padding: var(--spacing-3);
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-size-base);
  }
  :global(.delete-summary) {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: var(--font-size-base);
  }
  :global(.delete-note) {
    margin: 0;
    line-height: 1.6;
  }
</style>
