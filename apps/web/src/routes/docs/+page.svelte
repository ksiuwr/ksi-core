<script lang="ts">
  import { ArrowUpRight, Folder } from '@lucide/svelte';
  import { locale } from '$lib/locale.svelte';
  let { data } = $props<{ data: import('./$types').PageData }>();
  const groups = $derived.by(() => {
    type Group = {
      projectSlug: string | null;
      name: string;
      folder: string;
      pages: typeof data.pages;
    };
    const grouped = new Map<string, Group>();
    for (const page of data.pages) {
      const folder = page.folder || '';
      const key = JSON.stringify([page.projectSlug, folder]);
      let group = grouped.get(key);
      if (!group) {
        group = {
          projectSlug: page.projectSlug,
          name: page.projectName ?? 'KSI',
          folder,
          pages: []
        };
        grouped.set(key, group);
      }
      group.pages.push(page);
    }
    return [...grouped.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name, locale.current) ||
        a.folder.localeCompare(b.folder, locale.current)
    );
  });
  const formatter = $derived(
    new Intl.DateTimeFormat(locale.current, { day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<svelte:head><title>Documentation · KSI UWr</title></svelte:head>

<main class="flex-1">
  <header class="border-line border-b">
    <div class="pt-4 pb-8 md:pb-12">
      <p class="eyebrow"><span class="dot"></span>Docs</p>
      <h1 class="mt-4 text-[clamp(40px,6vw,64px)] font-bold tracking-[-0.045em]">Documentation</h1>
      <p class="text-muted mt-4 max-w-xl text-lg leading-relaxed">
        How KSI and its projects work, shared openly by our members.
      </p>
    </div>
  </header>
  <div class="py-10">
    {#if data.pages.length}
      {#each groups as group (JSON.stringify([group.projectSlug, group.folder]))}
        <section
          class="docs-group"
          aria-label={[group.name, group.folder].filter(Boolean).join(' / ')}
        >
          <h2 class="docs-context">
            <Folder size={15} aria-hidden="true" /><span>{group.name}</span>
            {#if group.folder}<span class="docs-folder"
                >/ {group.folder.split('/').join(' / ')}</span
              >{/if}
          </h2>
          <ul class="docs-grid">
            {#each group.pages as page (`${page.projectSlug ?? ''}/${page.slug}`)}
              <li>
                <a
                  class="docs-card surface-card surface-card-link"
                  href={`/docs/${encodeURIComponent(page.projectSlug ?? 'association')}/${encodeURIComponent(page.slug)}`}
                >
                  <span class="docs-title">{page.title}</span>
                  {#if page.excerpt}<span class="docs-excerpt">{page.excerpt}</span>{/if}
                  <span class="docs-footer">
                    <time datetime={page.updatedAt}
                      >{formatter.format(new Date(page.updatedAt))}</time
                    >
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </span>
                </a>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {:else}
      <p class="text-muted">No public documentation yet.</p>
    {/if}
  </div>
</main>

<style>
  .docs-group + .docs-group {
    margin-top: 36px;
  }
  .docs-group h2 {
    margin: 0 0 14px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }
  .docs-folder {
    overflow-wrap: anywhere;
  }
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
    font-size: 12px;
    flex-wrap: wrap;
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
