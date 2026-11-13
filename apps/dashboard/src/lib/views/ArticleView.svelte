<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import { primaryContentLocale, type ContentLocale } from 'shared/content-locales';
  import { untrack } from 'svelte';
  import {
    Badge,
    Banner,
    Button,
    CheckboxInput,
    Divider,
    Heading,
    HStack,
    Link,
    MetadataList,
    MetadataListItem,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft, ArrowUpRight, Save } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    article,
    permissions,
    websiteOrigin,
    refresh
  }: {
    workspace: Workspace;
    projectSlug: string;
    article: Article;
    permissions: {
      canCreate: boolean;
      canEdit: boolean;
      canSave: boolean;
      canPublish: boolean;
      canPropose: boolean;
      canManage: boolean;
    };
    websiteOrigin: string;
    refresh: () => Promise<void>;
  } = $props();
  const language = $derived(preferences.language);

  let draft = $state<Article>(untrack(() => ({ ...article })));
  let title = $state(untrack(() => article.title));
  let markdown = $state(untrack(() => article.markdown));
  let thumbnailFileId = $state<string | null>(untrack(() => article.thumbnailFileId));
  let thumbnailUploading = $state(false);
  let showCredit = $state(untrack(() => article.publicCredit ?? false));
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');
  let contentLocale = $state<ContentLocale>(primaryContentLocale);
  let translationDraft = $state<Record<string, string>>({});

  function localized(key: 'title' | 'markdown', primary: string) {
    return contentLocale === primaryContentLocale ? primary : (translationDraft[key] ?? '');
  }

  function setLocalized(key: 'title' | 'markdown', value: string) {
    if (contentLocale === primaryContentLocale) {
      if (key === 'title') title = value;
      else markdown = value;
    } else translationDraft[key] = value;
  }

  $effect(() => {
    draft = { ...article };
    title = article.title;
    markdown = article.markdown;
    thumbnailFileId = article.thumbnailFileId;
    showCredit = article.publicCredit ?? false;
  });

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    busy = true;
    error = '';
    notice = '';
    try {
      await work();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  function save(publish: boolean) {
    void run(async () => {
      const result = await api<Article>(
        `/platform/articles/${encodeURIComponent(draft.id)}`,
        'PUT',
        {
          version: draft.version,
          title,
          markdown,
          thumbnailFileId,
          state: publish
            ? 'published'
            : workspace === 'project' && !permissions.canPublish
              ? draft.state
              : 'draft',
          mainArticle: draft.mainArticle,
          projectFeed: draft.projectFeed,
          websiteFeed: draft.websiteFeed
        }
      );
      draft = { ...result, publicCredit: showCredit, canManageCredit: draft.canManageCredit };
      await refresh();
      notice = 'Zapisano.';
    });
  }

  function propose() {
    void run(async () => {
      await api(`/platform/articles/${encodeURIComponent(draft.id)}/proposals`, 'POST', {
        baseVersion: draft.version,
        title,
        markdown
      });
      notice = 'Twoja propozycja zmian została wysłana.';
    });
  }

  function updateCredit(value: boolean) {
    showCredit = value;
    void run(() =>
      api(`/platform/articles/${encodeURIComponent(draft.id)}/credit`, 'PUT', {
        publicCredit: value
      })
    );
  }
</script>

<VStack gap={5}>
  <HStack>
    <Button
      href={dashboardPath(workspace, projectSlug, 'articles')}
      variant="secondary"
      label="Wszystkie artykuły"
    >
      {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>

  {#if permissions.canManage}
    <ContentTranslations
      kind="article"
      id={draft.id}
      version={draft.version}
      translations={draft.translations}
      baseline={{ title, markdown }}
      bind:selected={contentLocale}
      bind:draft={translationDraft}
      onsaved={refresh}
    />
  {/if}

  <HStack vAlign="start" gap={8} wrap="wrap">
    <VStack gap={4} class="article-main">
      {#if permissions.canEdit}
        <TextInput
          id="article-title"
          label="Tytuł"
          isLabelHidden
          value={localized('title', title)}
          onChange={(value) => setLocalized('title', value)}
          isRequired={contentLocale === primaryContentLocale}
          placeholder={'Tytuł'}
          width="100%"
          size="lg"
        />
      {:else}
        <Heading level={1}>{draft.title}</Heading>
      {/if}
      <VStack class="article-editor">
        {#if permissions.canEdit}
          <Editor
            allowGallery
            rows={24}
            bind:value={
              () => localized('markdown', markdown), (value) => setLocalized('markdown', value)
            }
          />
        {:else}
          <MarkdownContent value={markdown} />
        {/if}
      </VStack>
    </VStack>

    <VStack as="aside" gap={4} class="article-aside" aria-label={'Ustawienia'}>
      {#if error}<Banner status="error" title={error} role="alert" />{/if}
      {#if notice}<Banner status="success" title={notice} role="status" />{/if}

      <VStack gap={3}>
        <Heading level={2}>Status</Heading>
        <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
          <Badge
            variant={draft.state === 'published' ? 'success' : 'neutral'}
            label={draft.state === 'published' ? 'Opublikowany' : 'Szkic'}
          />
          {#if draft.state === 'published'}
            <Link
              href={`${websiteOrigin}/articles/${encodeURIComponent(draft.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              type="supporting"
              color="secondary"
            >
              Zobacz publiczny artykuł
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          {/if}
        </HStack>
        {#if contentLocale === primaryContentLocale}
          <VStack gap={2}>
            {#if permissions.canPublish}
              <Button
                label="Opublikuj"
                variant="primary"
                width="100%"
                isDisabled={busy || thumbnailUploading}
                onclick={() => save(true)}
              />
            {/if}
            {#if permissions.canSave}
              <Button
                label={draft.state === 'published' && !permissions.canPublish
                  ? 'Zapisz zmiany'
                  : 'Zapisz szkic'}
                variant="secondary"
                width="100%"
                isDisabled={busy || thumbnailUploading}
                onclick={() => save(false)}
              >
                {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
              </Button>
            {/if}
            {#if permissions.canPropose}
              <Button
                label="Zaproponuj zmianę"
                variant="secondary"
                width="100%"
                isDisabled={busy || thumbnailUploading}
                onclick={propose}
              />
            {/if}
          </VStack>
        {:else}
          <Text as="p" type="supporting">Zapisz tłumaczenie na pasku języka powyżej.</Text>
        {/if}
      </VStack>

      {#if contentLocale === primaryContentLocale}
        <Divider />
        <MetadataList>
          <MetadataListItem label="Slug">
            <Text type="code">{draft.slug}</Text>
          </MetadataListItem>
        </MetadataList>
        <Divider />
        {#key draft.id}
          <ArticleThumbnail
            bind:fileId={thumbnailFileId}
            bind:uploading={thumbnailUploading}
            disabled={busy || !permissions.canSave}
          />
        {/key}
      {/if}

      {#if permissions.canManage && contentLocale === primaryContentLocale}
        <Divider />
        <VStack gap={2}>
          <Heading level={2}>Publikacja</Heading>
          {#if workspace === 'project'}
            <CheckboxInput
              label="Główny artykuł projektu"
              value={draft.mainArticle}
              onChange={(checked) => (draft.mainArticle = checked)}
            />
            <Text as="p" type="supporting">
              Po opublikowaniu ten artykuł pojawi się na publicznej stronie projektu i zastąpi
              poprzedni główny artykuł. Zapisz lub opublikuj, aby zastosować ustawienie.
            </Text>
            <CheckboxInput
              label="Pokaż w artykułach projektu"
              value={draft.projectFeed}
              onChange={(checked) => (draft.projectFeed = checked)}
            />
          {/if}
          <CheckboxInput
            label="Pokaż w artykułach na stronie"
            value={draft.websiteFeed}
            onChange={(checked) => (draft.websiteFeed = checked)}
          />
          <Text as="p" type="supporting">
            Te ustawienia obowiązują po opublikowaniu artykułu. Artykuł główny jest wyświetlany
            oddzielnie od listy artykułów projektu.
          </Text>
        </VStack>
      {/if}

      {#if draft.canManageCredit && contentLocale === primaryContentLocale}
        <Divider />
        <CheckboxInput label="Pokaż mnie jako autora" value={showCredit} onChange={updateCredit} />
      {/if}
    </VStack>
  </HStack>
</VStack>

<style>
  :global(.article-main) {
    flex: 1 1 34rem;
    min-width: 0;
  }
  :global(.article-aside) {
    flex: 0 1 19rem;
    min-width: 0;
    position: sticky;
    top: 5.625rem;
  }
  :global(.article-editor) {
    min-width: 0;
  }
  @media (max-width: 61.25rem) {
    :global(.article-aside) {
      flex-basis: 100%;
      position: static;
    }
  }
</style>
