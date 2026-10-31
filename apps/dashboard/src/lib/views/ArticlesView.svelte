<script lang="ts">
  import { articlePath, newArticlePath, type Workspace } from '$lib/navigation';
  import type { Article } from '$lib/types';
  import { FileText, Plus } from '@lucide/svelte';

  let {
    workspace,
    projectSlug,
    articles,
    canCreate
  }: {
    workspace: Workspace;
    projectSlug: string;
    articles: Article[];
    canCreate: boolean;
  } = $props();
</script>

<div class="workspace-header">
  <div>
    <h1>Artykuły</h1>
    <p class="workspace-description">Pisz publikacje i proponuj zmiany.</p>
  </div>
  {#if canCreate}
    <a class="btn" href={newArticlePath(workspace, projectSlug)}
      ><Plus size={16} aria-hidden="true" />Nowy artykuł</a
    >
  {/if}
</div>

{#if articles.length}
  <ul class="list-group">
    {#each articles as article (article.id)}
      <li>
        <a class="list-row article-row" href={articlePath(article.slug)}>
          <FileText size={15} aria-hidden="true" />
          <span class="article-main">
            <span class="list-row-title">{article.title}</span>
            <span class="list-row-meta">{article.slug}</span>
          </span>
          {#if article.mainArticle}<span class="tag tag-mint">Główny artykuł projektu</span>{/if}
          <span class="tag">{article.state === 'published' ? 'Opublikowany' : 'Szkic'}</span>
        </a>
      </li>
    {/each}
  </ul>
{:else}
  <p class="list-empty">Brak artykułów. Utwórz pierwszy artykuł w tym obszarze roboczym.</p>
{/if}

<style>
  .article-row {
    flex-wrap: wrap;
  }
  .article-main {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
  }
</style>
