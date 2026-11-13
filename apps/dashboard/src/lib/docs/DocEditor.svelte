<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import ContentLocaleEditor from '$lib/ContentLocaleEditor.svelte';
  import { ArrowLeft, FileDiff, FolderPlus, Save, Send } from '@lucide/svelte';
  import {
    cleanDocTranslations,
    docSlugPattern,
    docsPath,
    reservedDocSlugs,
    type DocTranslations
  } from 'shared/docs';
  import type { DocFolder } from 'shared/doc-folders';
  import DocFolderSelect from './DocFolderSelect.svelte';
  import {
    contentLocaleName,
    primaryContentLocale,
    translationLocales,
    type ContentLocale
  } from 'shared/content-locales';
  import { preferences } from '$lib/preferences.svelte';
  import { invalidateAll } from '$app/navigation';
  import DocFolderDialog from './DocFolderDialog.svelte';
  import DocDiff from './DocDiff.svelte';
  import DocError from './DocError.svelte';
  import {
    docsRequest,
    errorCode,
    slugFromTitle,
    textIn,
    type DocAccess,
    type DocDetail
  } from './docs';
  import {
    Button,
    Card,
    CheckboxInput,
    Grid,
    Heading,
    HStack,
    Icon,
    StackItem,
    Text,
    TextArea,
    TextInput,
    VStack
  } from '@astryx-sv/core';

  let {
    projectId,
    slug,
    page,
    access,
    folders,
    workspaceName
  }: {
    projectId: string;
    slug: string | null;
    /** Null while creating a page. */
    page: DocDetail | null;
    access: DocAccess;
    /** Existing folders of the workspace, offered as suggestions. */
    folders: DocFolder[];
    workspaceName: string;
  } = $props();

  const language = $derived(preferences.language);
  const locales: ContentLocale[] = [primaryContentLocale, ...translationLocales];
  // Live updates refresh the page data; the editor keeps the version it started from,
  // so saving over someone else's change is still reported as a conflict.
  const original = untrack(() =>
    page
      ? {
          id: page.id,
          slug: page.slug,
          version: page.version,
          folder: page.folder,
          folderId: page.folderId,
          title: page.title,
          markdown: page.markdown,
          translations: cleanDocTranslations(page.translations),
          public: page.public
        }
      : null
  );
  // Polish is the page itself; other languages are optional translations of it.
  let texts = $state(
    Object.fromEntries(
      locales.map((locale) => [locale, { ...textIn(original, locale) }])
    ) as Record<ContentLocale, { title: string; markdown: string }>
  );
  let editing = $state<ContentLocale>(primaryContentLocale);
  let folderId = $state(original?.folderId ?? '');
  let addingFolder = $state(false);
  let address = $state('');
  let addressEdited = $state(false);
  let reason = $state('');
  let visible = $state(original?.public ?? false);
  let compared = $state<{ locale: ContentLocale; markdown: string } | null>(null);
  let busy = $state(false);
  let error = $state('');

  const translations = $derived(
    cleanDocTranslations(
      Object.fromEntries(
        translationLocales.map((locale) => [locale, texts[locale]])
      ) as DocTranslations
    )
  );
  const localeDirty = $derived(
    JSON.stringify(texts[editing]) !== JSON.stringify(textIn(original, editing))
  );
  const addedLocales = $derived(translationLocales.filter((locale) => !!translations[locale]));
  const direct = $derived(access.canReview);
  const addressValid = $derived(
    new RegExp(docSlugPattern).test(address) && !reservedDocSlugs.includes(address)
  );
  const addressHint = $derived(`Inne strony linkują tutaj, wpisując [${address || 'address'}]`);
  const changed = $derived(
    !original ||
      texts[primaryContentLocale].title.trim() !== original.title ||
      texts[primaryContentLocale].markdown !== original.markdown ||
      (folderId || null) !== original.folderId ||
      visible !== original.public ||
      JSON.stringify(translations) !== JSON.stringify(original.translations)
  );
  const ready = $derived(
    !!texts[primaryContentLocale].title.trim() &&
      changed &&
      (!!original || addressValid) &&
      (direct || reason.trim().length >= 3)
  );
  const back = $derived(original ? docsPath(slug, original.slug) : docsPath(slug));

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!ready || busy) return;
    busy = true;
    error = '';
    const content = {
      title: texts[primaryContentLocale].title.trim(),
      markdown: texts[primaryContentLocale].markdown,
      folderId: folderId || null,
      translations,
      public: visible,
      reason: reason.trim()
    };
    try {
      if (direct && original) {
        await docsRequest(`/docs/${original.id}`, 'PUT', { ...content, version: original.version });
        await goto(docsPath(slug, original.slug));
      } else if (direct) {
        await docsRequest('/docs', 'POST', {
          ...content,
          slug: address,
          ...(projectId ? { projectId } : {})
        });
        await goto(docsPath(slug, address));
      } else {
        const proposal = await docsRequest<{ id: string }>('/docs/proposals', 'POST', {
          ...content,
          ...(original
            ? { pageId: original.id, baseVersion: original.version }
            : { slug: address, ...(projectId ? { projectId } : {}) })
        });
        await goto(docsPath(slug, 'suggestions', proposal.id));
      }
    } catch (cause) {
      error = errorCode(cause);
    } finally {
      busy = false;
    }
  }
</script>

<HStack class="workspace-header" hAlign="between" vAlign="start" wrap="wrap" gap={4}>
  <VStack gap={1}>
    <Text type="supporting" class="workspace-eyebrow">{workspaceName}</Text>
    <Heading level={1}>
      {#if original && direct}Edytuj stronę{:else if original}Zaproponuj zmiany{:else if direct}Nowa
        strona{:else}Zaproponuj nową stronę{/if}
    </Heading>
    {#if !direct}
      <Text as="p" class="workspace-description">
        Liderzy i recenzenci tej przestrzeni porównają Twoją wersję z obecną i ją zaakceptują lub
        odrzucą.
      </Text>
    {/if}
  </VStack>
  <Button href={back} variant="secondary" label="Anuluj">
    {#snippet icon()}<Icon icon={ArrowLeft} size="sm" />{/snippet}
  </Button>
</HStack>
<DocError code={error} />
{#if !access.canPropose}
  <DocError code="FORBIDDEN" />
{:else}
  <Card padding={6}>
    <VStack as="form" gap={5} onsubmit={submit}>
      <Grid columns={{ minWidth: 240, max: 2 }} gap={5}>
        {#if !original}
          <TextInput
            id="doc-address"
            label="Adres"
            value={address}
            isRequired
            description={address && !addressValid ? undefined : addressHint}
            status={address && !addressValid
              ? {
                  type: 'error',
                  message:
                    'Użyj małych liter, cyfr i pojedynczych myślników. Adresy „new”, „suggestions” i „contributors” są zarezerwowane.'
                }
              : undefined}
            onChange={(next) => {
              address = next.slice(0, 100);
              addressEdited = true;
            }}
          />
        {/if}
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <DocFolderSelect
              id="doc-folder"
              bind:value={folderId}
              {folders}
              label={'Folder'}
              locale={language}
              disabled={busy}
            />
          </StackItem>
          {#if access.canReview}
            <Button variant="secondary" label="Nowy folder" onclick={() => (addingFolder = true)}>
              {#snippet icon()}<Icon icon={FolderPlus} size="sm" />{/snippet}
            </Button>
          {/if}
        </HStack>
      </Grid>

      <ContentLocaleEditor
        bind:selected={editing}
        added={addedLocales}
        dirty={localeDirty}
        {busy}
        saveHint={'Wszystkie wersje językowe są zapisywane razem z dokumentem.'}
        onremove={() => {
          if (editing !== primaryContentLocale) texts[editing] = { title: '', markdown: '' };
        }}
      >
        {#snippet reference()}
          <div class="docs-editor-source" lang={primaryContentLocale}>
            <Heading level={3}>{texts[primaryContentLocale].title || 'Brak treści'}</Heading>
            <MarkdownContent
              value={texts[primaryContentLocale].markdown}
              docs
              docLocale={primaryContentLocale}
            />
          </div>
        {/snippet}
      </ContentLocaleEditor>

      {#key editing}
        <TextInput
          id="doc-title"
          label="Tytuł"
          value={texts[editing].title}
          isRequired={editing === primaryContentLocale}
          placeholder={editing === primaryContentLocale ? '' : texts[primaryContentLocale].title}
          onChange={(next) => {
            texts[editing].title = next.slice(0, 200);
            if (editing === primaryContentLocale && !original && !addressEdited)
              address = slugFromTitle(texts[primaryContentLocale].title);
          }}
        />
        <VStack gap={0}>
          <Editor
            bind:value={texts[editing].markdown}
            rows={22}
            allowGallery
            docs
            docLocale={editing}
          />
        </VStack>
      {/key}

      <Grid columns={{ minWidth: 240, max: 2 }} gap={5}>
        <TextArea
          id="doc-reason"
          label={direct ? 'Podsumowanie zmian (opcjonalnie)' : 'Powód zmiany'}
          value={reason}
          rows={3}
          maxLength={1000}
          isRequired={!direct}
          placeholder={'Co się zmieniło i dlaczego? Na przykład: „Uzupełnione po ZOSI 2026, zabrakło przedłużaczy”.'}
          onChange={(next) => (reason = next)}
        />
        <VStack gap={2} class="docs-editor-visibility">
          <CheckboxInput
            label={direct ? 'Publiczna na stronie KSI' : 'Poproś o publikację na stronie KSI'}
            value={visible}
            isDisabled={direct && !access.canPublish}
            onChange={(checked) => (visible = checked)}
            description={direct && !access.canPublish
              ? 'Tylko liderzy przestrzeni mogą zmieniać widoczność publiczną strony.'
              : 'Strony publiczne może czytać każdy. Linki do stron wewnętrznych pokazują tylko ich tytuły.'}
          />
        </VStack>
      </Grid>
      <HStack hAlign="end" gap={2} wrap="wrap">
        <Button
          variant="secondary"
          label={compared &&
          (compared.locale !== editing || compared.markdown !== texts[editing].markdown)
            ? 'Odśwież porównanie'
            : 'Przejrzyj zmiany'}
          isDisabled={!changed}
          onclick={() => (compared = { locale: editing, markdown: texts[editing].markdown })}
        >
          {#snippet icon()}<Icon icon={FileDiff} size="sm" />{/snippet}
        </Button>
        <Button
          type="submit"
          label={direct ? (original ? 'Zapisz zmiany' : 'Utwórz stronę') : 'Wyślij propozycję'}
          isDisabled={!ready || busy}
        >
          {#snippet icon()}
            <Icon icon={direct ? Save : Send} size="sm" />
          {/snippet}
        </Button>
      </HStack>
    </VStack>
  </Card>
  {#if compared}
    <VStack as="section" gap={3} class="docs-editor-compare" aria-label={'Zmiany'}>
      <Heading level={2}>Twoje zmiany · {contentLocaleName(compared.locale, language)}</Heading>
      <DocDiff
        before={textIn(original, compared.locale).markdown}
        after={compared.markdown}
        locale={compared.locale}
        {projectId}
        beforeLabel={'Obecna wersja'}
        afterLabel={'Twoja wersja'}
      />
    </VStack>
  {/if}
{/if}

<DocFolderDialog
  open={addingFolder}
  {projectId}
  {folders}
  parentId={folderId || null}
  onclose={() => (addingFolder = false)}
  onsaved={async (folder) => {
    await invalidateAll();
    folderId = folder.id;
    addingFolder = false;
  }}
/>

<style>
  .docs-editor-source {
    padding: var(--spacing-3) var(--spacing-4);
    max-height: 400px;
    overflow: auto;
    font-size: var(--font-size-base);
    line-height: 1.7;
  }
  :global(.docs-editor-visibility) {
    padding-top: var(--spacing-4);
  }
  :global(.docs-editor-compare) {
    margin-top: var(--spacing-7);
  }
  @media (max-width: 760px) {
    :global(.docs-editor-visibility) {
      padding-top: 0;
    }
  }
</style>
