<script lang="ts">
  import { ArrowUpRight, FileText } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<svelte:head><title>Documentation · KSI UWr</title></svelte:head>

<main class="flex-1">
  <header class="border-line border-b">
    <div class="page-container py-14 md:py-20">
      <p class="eyebrow"><span class="dot"></span>Docs</p>
      <h1 class="mt-4 text-[clamp(40px,6vw,64px)] font-bold tracking-[-0.045em]">Documentation</h1>
      <p class="text-muted mt-4 max-w-xl text-lg leading-relaxed">
        How KSI and its projects work, shared openly by our members.
      </p>
    </div>
  </header>
  <div class="page-container py-10 pb-20">
    {#if data.pages.length}
      <ul class="docs-grid">
        {#each data.pages as page (`${page.projectSlug ?? ''}/${page.slug}`)}
          <li>
            <a
              class="docs-card surface-card surface-card-link"
              href={`/docs/${encodeURIComponent(page.projectSlug ?? 'association')}/${encodeURIComponent(page.slug)}`}
            >
              <span class="docs-context"
                ><FileText size={14} aria-hidden="true" />{page.projectName ?? 'KSI'}</span
              >
              <span class="docs-title">{page.title}</span>
              {#if page.excerpt}<span class="docs-excerpt">{page.excerpt}</span>{/if}
              <span class="docs-footer">
                <time datetime={page.updatedAt}>{formatter.format(new Date(page.updatedAt))}</time>
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted">No public documentation yet.</p>
    {/if}
  </div>
</main>

<style>
  .docs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 14px;
    max-width: 64rem;
  }
  .docs-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 22px;
    color: var(--ink);
  }
  .docs-context {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }
  .docs-title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .docs-excerpt {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.55;
  }
  .docs-footer {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    color: var(--muted);
    font-size: 12px;
  }
</style>
