<script lang="ts">
  import { goto } from '$app/navigation';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import ArticleThumbnail from '$lib/ArticleThumbnail.svelte';
  import { api, errorMessage } from '$lib/api';
  import { articlePath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import { ArrowUpRight, Plus } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    projectId,
    articles,
    language,
    canCreate
  }: {
    workspace: Workspace;
    projectSlug: string;
    projectId: string;
    articles: Article[];
    language: 'pl' | 'en';
    canCreate: boolean;
  } = $props();

  let newArticle = $state(false);
  let title = $state('');
  let slug = $state('');
  let markdown = $state('');
  let thumbnailFileId = $state<string | null>(null);
  let thumbnailUploading = $state(false);
  let busy = $state(false);
  let error = $state('');

  async function create() {
    if (busy || !title.trim() || !slug.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Article>('/platform/articles', 'POST', {
        slug,
        title,
        markdown,
        ...(projectId ? { projectId } : {}),
        language: 'en',
        thumbnailFileId
      });
      await goto(articlePath(result.slug));
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }

  function startNew() {
    title = '';
    slug = '';
    markdown = '';
    thumbnailFileId = null;
    thumbnailUploading = false;
    newArticle = true;
  }
</script>

<div class="workspace-header">
  <div>
    <h1>{'Articles'}</h1>
    <p class="workspace-description">
      {language === 'pl'
        ? 'Pisz publikacje i proponuj zmiany.'
        : 'Write publications and propose changes.'}
    </p>
  </div>
  {#if canCreate && !newArticle}
    <button class="btn" disabled={busy} onclick={startNew}
      ><Plus size={16} aria-hidden="true" />{'New article'}</button
    >
  {/if}
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}

{#if newArticle}
  <div class="card" style="max-width: 760px; margin-bottom: 24px;">
    <h2 style="font-size: 1.1rem; margin-bottom: 16px;">{'New article'}</h2>
    <label for="new-article-title">{'Title'}</label>
    <input id="new-article-title" bind:value={title} required />
    <label for="new-article-slug">Slug</label>
    <input id="new-article-slug" bind:value={slug} required />
    <ArticleThumbnail
      bind:fileId={thumbnailFileId}
      bind:uploading={thumbnailUploading}
      disabled={busy}
    />
    <div class="article-editor">
      <Editor {language} allowGallery bind:value={markdown} />
    </div>
    <div class="row" style="margin-top: 14px;">
      <button
        class="btn"
        disabled={busy || thumbnailUploading || !title.trim() || !slug.trim()}
        onclick={create}>{'Create'}</button
      >
      <button class="btn ghost" disabled={busy} onclick={() => (newArticle = false)}
        >{'Cancel'}</button
      >
    </div>
  </div>
{/if}

{#each articles as article (article.id)}
  <a class="list-strip article-link" href={articlePath(article.slug)}>
    <div class="list-strip-info">
      <h3>{article.title}</h3>
      <div class="list-strip-meta">{article.slug}</div>
    </div>
    <div class="row">
      {#if article.mainArticle}<span class="tag tag-mint">{'Main project article'}</span>{/if}
      <span class="tag">{article.state === 'published' ? 'Published' : 'Draft'}</span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </div>
  </a>
{/each}
{#if !articles.length && !newArticle}
  <p class="muted">{'No articles yet. Create the first article in this workspace.'}</p>
{/if}

<style>
  .article-editor {
    width: 100%;
    min-width: min(100%, 36rem);
  }
  .article-link {
    padding: 18px 20px;
    margin: 10px 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    flex-wrap: wrap;
    gap: 12px;
  }
  .article-link:hover {
    border-color: var(--muted);
  }
</style>
