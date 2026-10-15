<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { ArrowDown, ArrowUpRight, Search, X } from '@lucide/svelte';
  import ProjectPreview from '../../components/ui/ProjectPreview.svelte';

  let { data } = $props<{ data: import('./$types').PageData }>();

  const fieldLabels = $derived<Record<string, string>>({
    research: 'Research',
    community: 'Community',
    engineering: 'Engineering'
  });
  // Map backend data to frontend model
  let projects = $derived(
    (data.projects || []).map((p: any, i: number) => ({
      title: p.name,
      kind: p.fields[0] || 'engineering',
      group: p.fields[0] || 'community',
      fields: p.fields || [],
      number: String(i + 1).padStart(2, '0'),
      category: fieldLabels[p.fields[0]] || 'Project',
      href: `/projects/${p.slug}`,
      summary: p.description,
      tags: p.tags || []
    }))
  );

  // Sort projects alphabetically
  const orderedProjects = $derived([...projects].sort((a, b) => a.title.localeCompare(b.title)));
  const filters = [
    { value: 'all', label: 'All projects' },
    { value: 'community', label: 'Community' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'research', label: 'Research' }
  ];
  let query = $state('');
  const activeFilter = $derived(
    ['community', 'engineering', 'research'].includes(page.url.searchParams.get('field') ?? '')
      ? page.url.searchParams.get('field')!
      : 'all'
  );
  function setFilter(field: string) {
    const url = new URL(page.url);
    if (field === 'all') url.searchParams.delete('field');
    else url.searchParams.set('field', field);
    return goto(url, { noScroll: true, keepFocus: true });
  }
  let filteredProjects = $derived(
    orderedProjects.filter(
      (project) =>
        (activeFilter === 'all' || project.fields.includes(activeFilter)) &&
        [project.title, project.category, project.summary, ...project.tags]
          .join(' ')
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    )
  );
</script>

<svelte:head>
  <title>Projects · KSI UWr</title>
  <meta
    name="description"
    content="KSI projects: conferences, programming workshops, machine learning, and quantum computing."
  />
</svelte:head>

<main class="bg-base-100 min-h-[calc(100vh-56px)] w-full">
  <div class="mx-auto max-w-[900px] px-5 py-[60px]">
    <!-- Hero -->
    <header class="mb-20">
      <div class="text-base-content/70 mb-5 font-mono text-[11px] tracking-wider uppercase">
        ( our work )
      </div>
      <h1
        class="font-anybody text-base-content mb-5 text-[clamp(40px,8vw,64px)] leading-[1.1] font-bold tracking-tight"
      >
        Projects at KSI
      </h1>
      <p class="text-base-content/70 mb-8 max-w-[600px] text-[18px] leading-relaxed">
        Software, research, and events organized by KSI members.
      </p>
      <div class="flex flex-wrap gap-3">
        <a href="#project-directory" class="btn gap-2">
          Explore our projects <ArrowDown size={16} />
        </a>
      </div>
    </header>

    <div id="project-directory" class="scroll-mt-20">
      <div class="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div class="text-primary mb-3 font-mono text-[11px] tracking-wider uppercase">
            ( explore )
          </div>
          <h2
            class="font-anybody text-base-content mb-0 text-[32px] font-bold tracking-tight md:text-[40px]"
          >
            Find a project to join.
          </h2>
        </div>
        <p class="text-base-content/70 max-w-xs text-[14px] leading-relaxed">
          Browse projects by topic<br />or search by name.
        </p>
      </div>

      <div
        class="border-base-content/20 mb-8 flex flex-col justify-between gap-6 border-y py-5 xl:flex-row"
      >
        <div class="flex flex-wrap gap-2">
          {#each filters as filter (filter.label)}
            <button
              type="button"
              aria-pressed={activeFilter === filter.value}
              onclick={() => void setFilter(filter.value)}
              class="rounded border border-transparent px-4 py-2 text-[13px] transition-colors {activeFilter ===
              filter.value
                ? 'bg-primary text-primary-content'
                : 'text-base-content/70 hover:bg-base-content/10'}"
            >
              {filter.label}
            </button>
          {/each}
        </div>

        <label class="relative flex w-full items-center xl:max-w-sm">
          <input
            type="search"
            class="input border-base-content/20 text-base-content focus:border-primary w-full rounded border bg-transparent py-2 pr-4 pl-11 text-[14px] focus:outline-none"
            placeholder="Search projects..."
            bind:value={query}
          />
        </label>
      </div>

      <p class="text-base-content/50 mb-6 font-mono text-[11px]">
        Showing {filteredProjects.length} of {projects.length} projects
      </p>

      <!-- Project List -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        {#each filteredProjects as project (project.href)}
          <a
            href={project.href}
            class="card group border-base-content/20 bg-base-100 hover:border-primary/60 hover:bg-primary/5 flex flex-col overflow-hidden rounded border p-0 no-underline transition-colors {project.kind ===
            'conference'
              ? 'md:col-span-2 md:flex-row'
              : ''}"
          >
            <div
              class="border-base-content/20 border-b {project.kind === 'conference'
                ? 'md:w-2/5 md:border-r md:border-b-0'
                : 'h-[200px]'} flex shrink-0"
            >
              <div class="bg-base-200 flex h-full min-h-[200px] w-full items-center justify-center">
                <ProjectPreview kind={project.kind} />
              </div>
            </div>

            <div class="flex flex-1 flex-col p-6 md:p-8">
              <div
                class="mb-5 flex items-center justify-between gap-3 font-mono text-[11px] tracking-wider uppercase"
              >
                <span class="text-primary">( {project.category} )</span>
                <span class="text-base-content/40">{project.number}</span>
              </div>
              <h3
                class="font-anybody text-base-content mb-3 text-[24px] leading-tight font-bold lg:text-[28px]"
              >
                {project.title}
              </h3>
              <p class="text-base-content/70 mb-6 text-[14px] leading-relaxed">
                {project.summary}
              </p>

              <div class="mt-auto flex flex-wrap gap-2">
                {#each project.tags as tag}
                  <span
                    class="text-base-content/50 border-base-content/20 bg-base-200/50 rounded border px-2 py-1 font-mono text-[10px] tracking-wider uppercase"
                  >
                    {tag}
                  </span>
                {/each}
              </div>

              <div
                class="text-base-content/80 group-hover:text-primary mt-6 flex items-center gap-2 text-[13px] font-medium transition-colors"
              >
                Discover the project
                <ArrowUpRight
                  class="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </div>
            </div>
          </a>
        {:else}
          <div
            class="border-base-content/20 col-span-full rounded border border-dashed p-12 text-center"
          >
            <h3 class="font-anybody text-base-content mb-3 text-[24px] font-bold">
              No matching projects.
            </h3>
            <p class="text-base-content/70 mb-6 text-[14px]">
              Try another search or explore a different field.
            </p>
            <button
              class="btn btn-primary mx-auto gap-2"
              type="button"
              onclick={() => {
                query = '';
                void setFilter('all');
              }}
            >
              <X class="size-4" /> Clear filters
            </button>
          </div>
        {/each}
      </div>

      <!-- CTA -->
      <div
        class="border-base-content/20 mt-16 flex flex-col items-start justify-between gap-6 border-t pt-10 md:flex-row md:items-center"
      >
        <div>
          <div class="text-primary mb-3 font-mono text-[11px] tracking-wider uppercase">
            ( what's next? )
          </div>
          <h2 class="font-anybody text-base-content m-0 text-[24px] font-bold md:text-[32px]">
            Have a project idea?
          </h2>
        </div>
        <a href="mailto:ksi@cs.uni.wroc.pl" class="btn btn-primary group gap-2">
          Tell us about it
          <ArrowUpRight
            class="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
          />
        </a>
      </div>
    </div>
  </div>
</main>
