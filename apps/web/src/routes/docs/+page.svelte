<script lang="ts">
  import { BookOpen, Lock } from '@lucide/svelte';
  import { publicDocPages, publicDocPath, publicDocWorkspaces } from 'shared/public-docs';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const workspaces = $derived(publicDocWorkspaces(data.pages, locale.current));
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<svelte:head><title>Documentation · KSI UWr</title></svelte:head>

<main class="docs-index">
  <header>
    <p class="eyebrow"><span class="dot"></span>Docs</p>
    <h1>Documentation</h1>
    <p class="docs-lead">How KSI and its projects work, shared openly by our members.</p>
  </header>
  {#each workspaces as workspace (workspace.slug)}
    <section aria-labelledby={`workspace-${workspace.slug}`}>
      <h2 id={`workspace-${workspace.slug}`}>{workspace.name}</h2>
      <ul class="docs-grid">
        {#each publicDocPages(workspace) as page (page.slug)}
          <li>
            <a
              class="docs-card surface-card surface-card-link"
              href={publicDocPath(workspace.slug, page.slug)}
            >
              {#if page.folderTrail.length}
                <span class="docs-folder"
                  >{page.folderTrail.map((folder) => folder.name).join(' / ')}</span
                >
              {/if}
              <span class="docs-title">{page.title}</span>
              {#if page.excerpt}<span class="docs-excerpt">{page.excerpt}</span>{/if}
              <span class="docs-meta">
                <time datetime={page.updatedAt}>{formatter.format(new Date(page.updatedAt))}</time>
                {#if !page.public}<span class="docs-private"
                    ><Lock size={12} aria-hidden="true" />{'Members only'}</span
                  >{/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <div class="docs-empty">
      <BookOpen size={28} strokeWidth={1.4} aria-hidden="true" />
      <p>No public documentation yet.</p>
    </div>
  {/each}
</main>

<style>
  .docs-index {
    flex: 1;
    max-width: 920px;
  }
  header {
    margin-bottom: 40px;
  }
  h1 {
    margin-top: 14px;
    font-size: clamp(34px, 4.6vw, 48px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.045em;
  }
  .docs-lead {
    max-width: 36rem;
    margin-top: 14px;
    color: var(--muted);
    font-size: 17px;
    line-height: 1.6;
  }
  section + section {
    margin-top: 40px;
  }
  h2 {
    margin-bottom: 14px;
    font-size: 20px;
    font-weight: 600;
    text-transform: none;
    letter-spacing: -0.02em;
  }
  .docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 14px;
  }
  .docs-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
    padding: 20px;
    color: var(--ink);
  }
  .docs-folder {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .docs-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .docs-excerpt {
    display: -webkit-box;
    overflow: hidden;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  .docs-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    margin-top: auto;
    padding-top: 6px;
    color: var(--muted);
    font-size: 12px;
  }
  .docs-private {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .docs-empty {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 48px 24px;
    border: 1px dashed var(--input);
    border-radius: var(--radius-xl);
    color: var(--muted);
    font-size: 14px;
    text-align: center;
  }
</style>
