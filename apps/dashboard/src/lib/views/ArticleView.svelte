<script lang="ts">
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import ContentTranslations from '$lib/ContentTranslations.svelte';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import MarkdownContent from '@ksi-core/ui/platform/MarkdownContent.svelte';
  import { api, errorMessage } from '$lib/api';
  import { dashboardPath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import type { ContentLocale } from 'shared/content-locales';
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
  let contentLocale = $state<ContentLocale>('en');
  let translationDraft = $state<Record<string, string>>({});

  function localized(key: 'title' | 'markdown', english: string) {
    return contentLocale === 'en' ? english : (translationDraft[key] ?? '');
  }

  function setLocalized(key: 'title' | 'markdown', value: string) {
    if (contentLocale === 'en') {
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
      notice = 'Saved.';
    });
  }

  function propose() {
    void run(async () => {
      await api(`/platform/articles/${encodeURIComponent(draft.id)}/proposals`, 'POST', {
        baseVersion: draft.version,
        title,
        markdown
      });
      notice = 'Your proposed edit was submitted.';
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

<a class="btn btn-outline detail-back" href={dashboardPath(workspace, projectSlug, 'articles')}
  ><ArrowLeft size={15} aria-hidden="true" />{'All articles'}</a
>

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

<div class="detail-layout article-layout">
  <div class="detail-main">
    {#if permissions.canEdit}
      <input
        class="article-title-input"
        aria-label={'Title'}
        placeholder={'Title'}
        bind:value={() => localized('title', title), (value) => setLocalized('title', value)}
        required={contentLocale === 'en'}
      />
    {:else}
      <h1 class="detail-title">{draft.title}</h1>
    {/if}
    <div class="article-editor">
      {#if permissions.canEdit}
        <Editor
          {language}
          allowGallery
          rows={24}
          bind:value={
            () => localized('markdown', markdown), (value) => setLocalized('markdown', value)
          }
        />
      {:else}
        <MarkdownContent value={markdown} {language} />
      {/if}
    </div>
  </div>

  <aside class="detail-aside" aria-label={'Settings'}>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}

    <section class="aside-section">
      <h2>Status</h2>
      <div class="status-line">
        <span class="tag" class:tag-mint={draft.state === 'published'}
          >{draft.state === 'published' ? 'Published' : 'Draft'}</span
        >
        {#if draft.state === 'published'}
          <a
            class="status-link"
            href={`${websiteOrigin}/articles/${encodeURIComponent(draft.slug)}`}
            >{'View public article'}<ArrowUpRight size={13} aria-hidden="true" /></a
          >
        {/if}
      </div>
      {#if contentLocale === 'en'}<div class="action-stack">
          {#if permissions.canPublish}
            <button
              class="btn btn-coral"
              disabled={busy || thumbnailUploading}
              onclick={() => save(true)}>Publish</button
            >
          {/if}
          {#if permissions.canSave}
            <button
              class="btn btn-outline"
              disabled={busy || thumbnailUploading}
              onclick={() => save(false)}
            >
              <Save size={15} aria-hidden="true" />
              {draft.state === 'published' && !permissions.canPublish
                ? 'Save changes'
                : 'Save draft'}
            </button>
          {/if}
          {#if permissions.canPropose}
            <button class="btn btn-outline" disabled={busy || thumbnailUploading} onclick={propose}
              >Propose edit</button
            >
          {/if}
        </div>{:else}<p class="muted">Save the translation from the language bar above.</p>{/if}
    </section>

    {#if contentLocale === 'en'}<section class="aside-section">
        <dl class="metadata-list">
          <div>
            <dt>Slug</dt>
            <dd><code>{draft.slug}</code></dd>
          </div>
        </dl>
      </section>{/if}

    {#if contentLocale === 'en'}<section class="aside-section">
        {#key draft.id}
          <ArticleThumbnail
            bind:fileId={thumbnailFileId}
            bind:uploading={thumbnailUploading}
            disabled={busy || !permissions.canSave}
          />
        {/key}
      </section>{/if}

    {#if permissions.canManage && contentLocale === 'en'}
      <section class="aside-section">
        <h2>Publishing</h2>
        {#if workspace === 'project'}
          <label class="check"
            ><input
              type="checkbox"
              bind:checked={draft.mainArticle}
            />{'Main project article'}</label
          >
          <p class="muted">
            When published, this article appears on the public project home page. It replaces the
            previous main article. Save or publish to apply this setting.
          </p>
          <label class="check"
            ><input
              type="checkbox"
              bind:checked={draft.projectFeed}
            />{'Show in project articles'}</label
          >
        {/if}
        <label class="check"
          ><input
            type="checkbox"
            bind:checked={draft.websiteFeed}
          />{'Show in website articles'}</label
        >
        <p class="muted">
          These settings apply when the article is published. The main article is displayed
          separately from the project articles list.
        </p>
      </section>
    {/if}

    {#if draft.canManageCredit && contentLocale === 'en'}
      <section class="aside-section">
        <label class="check">
          <input
            type="checkbox"
            checked={showCredit}
            onchange={(event) => updateCredit(event.currentTarget.checked)}
          />
          {'Show my author credit'}
        </label>
      </section>
    {/if}
  </aside>
</div>

<style>
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
  .article-title-input {
    width: 100%;
    margin: 0 0 14px;
    padding: 6px 10px;
    margin-inline: -10px;
    width: calc(100% + 20px);
    border: 1px solid transparent;
    background: transparent !important;
    box-shadow: none;
    font-family: var(--display);
    font-size: clamp(24px, 2.6vw, 32px);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }
  .article-title-input:hover {
    border-color: var(--line);
  }
  .article-title-input:focus {
    background: var(--surface) !important;
  }
  .article-editor {
    min-width: 0;
  }
  .article-editor :global(textarea) {
    min-height: 60vh;
  }
  .status-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .status-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--muted);
    font-size: 12px;
    text-decoration: none;
  }
  .status-link:hover {
    color: var(--ink);
  }
  .action-stack {
    display: grid;
    gap: 8px;
  }
  .action-stack .btn {
    width: 100%;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--ink);
    font-size: 13px;
  }
  .aside-section p {
    margin: 0;
    font-size: 12px;
  }
  code {
    font-family: var(--mono);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
</style>
