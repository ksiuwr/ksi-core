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

<a class="btn btn-outline detail-back" href={dashboardPath(workspace, projectSlug, 'articles')}
  ><ArrowLeft size={15} aria-hidden="true" />Wszystkie artykuły</a
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
        aria-label={'Tytuł'}
        placeholder={'Tytuł'}
        bind:value={() => localized('title', title), (value) => setLocalized('title', value)}
        required={contentLocale === primaryContentLocale}
      />
    {:else}
      <h1 class="detail-title">{draft.title}</h1>
    {/if}
    <div class="article-editor">
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
    </div>
  </div>

  <aside class="detail-aside" aria-label={'Ustawienia'}>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if notice}<p class="notice" role="status">{notice}</p>{/if}

    <section class="aside-section">
      <h2>Status</h2>
      <div class="status-line">
        <span class="tag" class:tag-mint={draft.state === 'published'}
          >{draft.state === 'published' ? 'Opublikowany' : 'Szkic'}</span
        >
        {#if draft.state === 'published'}
          <a
            class="status-link"
            href={`${websiteOrigin}/articles/${encodeURIComponent(draft.slug)}`}
            >Zobacz publiczny artykuł<ArrowUpRight size={13} aria-hidden="true" /></a
          >
        {/if}
      </div>
      {#if contentLocale === primaryContentLocale}<div class="action-stack">
          {#if permissions.canPublish}
            <button
              class="btn btn-coral"
              disabled={busy || thumbnailUploading}
              onclick={() => save(true)}>Opublikuj</button
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
                ? 'Zapisz zmiany'
                : 'Zapisz szkic'}
            </button>
          {/if}
          {#if permissions.canPropose}
            <button class="btn btn-outline" disabled={busy || thumbnailUploading} onclick={propose}
              >Zaproponuj zmianę</button
            >
          {/if}
        </div>{:else}<p class="muted">Zapisz tłumaczenie na pasku języka powyżej.</p>{/if}
    </section>

    {#if contentLocale === primaryContentLocale}<section class="aside-section">
        <dl class="metadata-list">
          <div>
            <dt>Slug</dt>
            <dd><code>{draft.slug}</code></dd>
          </div>
        </dl>
      </section>{/if}

    {#if contentLocale === primaryContentLocale}<section class="aside-section">
        {#key draft.id}
          <ArticleThumbnail
            bind:fileId={thumbnailFileId}
            bind:uploading={thumbnailUploading}
            disabled={busy || !permissions.canSave}
          />
        {/key}
      </section>{/if}

    {#if permissions.canManage && contentLocale === primaryContentLocale}
      <section class="aside-section">
        <h2>Publikacja</h2>
        {#if workspace === 'project'}
          <label class="check"
            ><input type="checkbox" bind:checked={draft.mainArticle} />Główny artykuł projektu</label
          >
          <p class="muted">
            Po opublikowaniu ten artykuł pojawi się na publicznej stronie projektu i zastąpi
            poprzedni główny artykuł. Zapisz lub opublikuj, aby zastosować ustawienie.
          </p>
          <label class="check"
            ><input type="checkbox" bind:checked={draft.projectFeed} />Pokaż w artykułach projektu</label
          >
        {/if}
        <label class="check"
          ><input type="checkbox" bind:checked={draft.websiteFeed} />Pokaż w artykułach na stronie</label
        >
        <p class="muted">
          Te ustawienia obowiązują po opublikowaniu artykułu. Artykuł główny jest wyświetlany
          oddzielnie od listy artykułów projektu.
        </p>
      </section>
    {/if}

    {#if draft.canManageCredit && contentLocale === primaryContentLocale}
      <section class="aside-section">
        <label class="check">
          <input
            type="checkbox"
            checked={showCredit}
            onchange={(event) => updateCredit(event.currentTarget.checked)}
          />
          Pokaż mnie jako autora
        </label>
      </section>
    {/if}
  </aside>
</div>

<style>
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
  /* The scoped rule outranks the shared .detail-layout breakpoint, so repeat it here. */
  @media (max-width: 980px) {
    .article-layout {
      grid-template-columns: minmax(0, 1fr);
    }
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
