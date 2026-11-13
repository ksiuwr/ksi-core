<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import { primaryContentLocale } from 'shared/content-locales';
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import { api, errorMessage } from '$lib/api';
  import { articlePath, dashboardPath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import {
    Banner,
    Button,
    Divider,
    Heading,
    HStack,
    Section,
    Text,
    TextInput,
    VStack
  } from '@astryx-sv/core';
  import { ArrowLeft, FilePlus2 } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
  } = $props();
  const language = $derived(preferences.language);

  let title = $state('');
  let slug = $state('');
  let slugEdited = $state(false);
  let markdown = $state('');
  let thumbnailFileId = $state<string | null>(null);
  let thumbnailUploading = $state(false);
  let busy = $state(false);
  let error = $state('');

  function suggestedSlug(value: string) {
    return value
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 160);
  }

  function updateTitle(value: string) {
    title = value;
    if (!slugEdited) slug = suggestedSlug(value);
  }

  async function create() {
    if (busy || thumbnailUploading || !title.trim() || !slug.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Article>('/platform/articles', 'POST', {
        slug: slug.trim(),
        title: title.trim(),
        markdown,
        ...(projectId ? { projectId } : {}),
        language: primaryContentLocale,
        thumbnailFileId
      });
      await goto(articlePath(result.slug));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<VStack gap={4}>
  <Button
    href={dashboardPath(workspace, projectSlug, 'articles')}
    variant="secondary"
    label="Artykuły"
  >
    {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
  </Button>

  <VStack as="header" gap={1}>
    <Heading level={1}>Nowy artykuł</Heading>
    <Text as="p" class="workspace-description">
      Utwórz wersję roboczą. Publikację i widoczność w kanałach skonfigurujesz po zapisaniu.
    </Text>
  </VStack>

  {#if error}<Banner status="error" title={error} role="alert" />{/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      void create();
    }}
  >
    <HStack vAlign="start" gap={5} wrap="wrap">
      <Section padding={5} class="form-main">
        <VStack gap={5}>
          <TextInput
            id="new-article-title"
            label="Tytuł"
            value={title}
            onChange={updateTitle}
            isRequired
          />
          <VStack gap={2}>
            <Text type="label" weight="semibold">Treść</Text>
            <Editor allowGallery rows={24} bind:value={markdown} />
          </VStack>
        </VStack>
      </Section>

      <Section padding={5} class="form-aside">
        <VStack gap={4}>
          <TextInput
            id="new-article-slug"
            label="Slug"
            value={slug}
            onChange={(value) => {
              slug = value;
              slugEdited = true;
            }}
            isRequired
            placeholder="article-url"
            description="Używany w publicznym adresie artykułu."
          />
          <Divider />
          <ArticleThumbnail
            bind:fileId={thumbnailFileId}
            bind:uploading={thumbnailUploading}
            disabled={busy}
          />
          <Divider />
          <VStack gap={2}>
            <Button
              type="submit"
              variant="primary"
              width="100%"
              label={busy ? 'Tworzenie…' : 'Utwórz wersję roboczą'}
              isDisabled={busy || thumbnailUploading || !title.trim() || !slug.trim()}
            >
              {#snippet icon()}<FilePlus2 size={15} aria-hidden="true" />{/snippet}
            </Button>
            <Button
              href={dashboardPath(workspace, projectSlug, 'articles')}
              variant="secondary"
              width="100%"
              label="Anuluj"
            />
          </VStack>
        </VStack>
      </Section>
    </HStack>
  </form>
</VStack>

<style>
  :global(.form-main) {
    flex: 1 1 32rem;
    min-width: 0;
  }
  :global(.form-aside) {
    flex: 0 1 20rem;
    min-width: 0;
    position: sticky;
    top: 5.625rem;
  }
  @media (max-width: 61.25rem) {
    :global(.form-aside) {
      flex-basis: 100%;
      position: static;
    }
  }
</style>
