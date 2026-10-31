<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import { primaryContentLocale } from 'shared/content-locales';
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import { api, errorMessage } from '$lib/api';
  import { articlePath, dashboardPath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
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

<a class="btn btn-outline detail-back" href={dashboardPath(workspace, projectSlug, 'articles')}
  ><ArrowLeft size={15} aria-hidden="true" />Artykuły</a
>
<header class="create-heading">
  <h1>Nowy artykuł</h1>
  <p>Utwórz wersję roboczą. Publikację i widoczność w kanałach skonfigurujesz po zapisaniu.</p>
</header>

{#if error}<p class="error" role="alert">{error}</p>{/if}
<form
  class="detail-layout create-form"
  onsubmit={(event) => {
    event.preventDefault();
    void create();
  }}
>
  <section class="card create-main">
    <div>
      <label for="new-article-title">Tytuł</label>
      <input
        id="new-article-title"
        value={title}
        oninput={(event) => updateTitle(event.currentTarget.value)}
        required
        maxlength="200"
      />
    </div>
    <div>
      <span class="create-label">Treść</span>
      <Editor allowGallery rows={24} bind:value={markdown} />
    </div>
  </section>

  <aside class="card create-aside">
    <section class="create-section">
      <label for="new-article-slug">Slug</label>
      <input
        id="new-article-slug"
        bind:value={slug}
        required
        maxlength="160"
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        placeholder="article-url"
        oninput={() => (slugEdited = true)}
      />
      <p class="muted">Używany w publicznym adresie artykułu.</p>
    </section>
    <section class="create-section">
      <ArticleThumbnail
        bind:fileId={thumbnailFileId}
        bind:uploading={thumbnailUploading}
        disabled={busy}
      />
    </section>
    <div class="create-actions">
      <button class="btn" disabled={busy || thumbnailUploading || !title.trim() || !slug.trim()}
        ><FilePlus2 size={15} aria-hidden="true" />{busy
          ? 'Tworzenie…'
          : 'Utwórz wersję roboczą'}</button
      >
      <a class="btn btn-outline" href={dashboardPath(workspace, projectSlug, 'articles')}>Anuluj</a>
    </div>
  </aside>
</form>
