<script lang="ts">
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import { untrack } from 'svelte';
  import { ArrowLeft, ArrowUpRight, Save } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    article,
    permissions,
    websiteOrigin,
    language,
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
    language: 'pl' | 'en';
    refresh: () => Promise<void>;
  } = $props();

  let draft = $state<Article>(untrack(() => ({ ...article })));
  let title = $state(untrack(() => article.title));
  let markdown = $state(untrack(() => article.markdown));
  let thumbnailFileId = $state<string | null>(untrack(() => article.thumbnailFileId));
  let thumbnailUploading = $state(false);
  let showCredit = $state(untrack(() => article.publicCredit ?? false));
  let busy = $state(false);
  let error = $state('');
  let notice = $state('');

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
      notice = language === 'pl' ? 'Zapisano.' : 'Saved.';
    });
  }

  function propose() {
    void run(async () => {
      await api(`/platform/articles/${encodeURIComponent(draft.id)}/proposals`, 'POST', {
        baseVersion: draft.version,
        title,
        markdown
      });
      notice =
        language === 'pl' ? 'Propozycja została wysłana.' : 'Your proposed edit was submitted.';
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

<div class="workspace-header">
  <div>
    <a
      class="btn btn-outline"
      href={dashboardPath(workspace, projectSlug, 'articles')}
      style="margin-bottom: 14px;"><ArrowLeft size={15} aria-hidden="true" />{'All articles'}</a
    >
    <h1>{draft.title}</h1>
  </div>
  {#if draft.state === 'published'}
    <a class="btn btn-outline" href={`${websiteOrigin}/articles/${encodeURIComponent(draft.slug)}`}
      ><ArrowUpRight size={15} />{'View public article'}</a
    >
  {/if}
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if notice}<p class="notice" role="status">{notice}</p>{/if}

<div class="card">
  <label for="article-title">{'Title'}</label>
  <input id="article-title" bind:value={title} readonly={!permissions.canEdit} required />
  <label for="article-slug">Slug</label>
  <input id="article-slug" value={draft.slug} readonly required />
  {#key draft.id}
    <ArticleThumbnail
      bind:fileId={thumbnailFileId}
      bind:uploading={thumbnailUploading}
      disabled={busy || !permissions.canSave}
    />
  {/key}
  <div class="article-editor">
    {#if permissions.canEdit}
      <Editor {language} allowGallery bind:value={markdown} />
    {:else}
      <MarkdownContent value={markdown} {language} />
    {/if}
  </div>

  {#if draft && workspace === 'project' && permissions.canManage}
    <div class="main-article-setting">
      <label
        ><input type="checkbox" bind:checked={draft.mainArticle} />{'Main project article'}</label
      >
      <p class="muted">
        {'When published, this article appears on the public project home page. It replaces the previous main article. Save or publish to apply this setting.'}
      </p>
    </div>
  {/if}
  {#if permissions.canManage}
    <div class="main-article-setting">
      {#if workspace === 'project'}
        <label
          ><input
            type="checkbox"
            bind:checked={draft.projectFeed}
          />{'Show in project articles'}</label
        >
      {/if}
      <label
        ><input
          type="checkbox"
          bind:checked={draft.websiteFeed}
        />{'Show in website articles'}</label
      >
      <p class="muted">
        {'These settings apply when the article is published. The main article is displayed separately from the project articles list.'}
      </p>
    </div>
  {/if}

  <div class="row" style="margin-top: 16px; gap: 8px; flex-wrap: wrap;">
    {#if permissions.canSave}
      <button class="btn" disabled={busy || thumbnailUploading} onclick={() => save(false)}>
        <Save size={15} aria-hidden="true" />
        {draft.state === 'published' && !permissions.canPublish ? 'Save changes' : 'Save draft'}
      </button>
    {/if}
    {#if permissions.canPublish}
      <button
        class="btn btn-coral"
        disabled={busy || thumbnailUploading}
        onclick={() => save(true)}
      >
        {'Publish'}
      </button>
    {/if}
    {#if permissions.canPropose}
      <button class="btn btn-outline" disabled={busy || thumbnailUploading} onclick={propose}>
        {'Propose edit'}
      </button>
    {/if}
    {#if draft.canManageCredit}
      <label class="credit-toggle">
        <input
          type="checkbox"
          checked={showCredit}
          onchange={(event) => updateCredit(event.currentTarget.checked)}
        />
        {'Show my author credit'}
      </label>
    {/if}
  </div>
</div>

{#if permissions.canManage}
  <ContentTranslations
    kind="article"
    id={draft.id}
    version={draft.version}
    translations={draft.translations}
    baseline={{ title: draft.title, markdown: draft.markdown }}
    {language}
    onsaved={refresh}
  />
{/if}

<style>
  .article-editor {
    width: 100%;
    min-width: min(100%, 36rem);
  }
  .main-article-setting {
    margin-top: 20px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .main-article-setting label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .main-article-setting p {
    margin: 8px 0 0;
  }
  .credit-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--muted);
    cursor: pointer;
  }
</style>
