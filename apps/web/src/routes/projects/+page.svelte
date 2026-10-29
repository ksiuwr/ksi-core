<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { Search, SearchX, X } from '@lucide/svelte';
  import { slider } from '@ksi-core/ui/platform/slider';
  import { projectFields } from '$lib/project-cover';
  import FieldName from '../../components/ui/FieldName.svelte';
  import ProjectCard from '../../components/ui/ProjectCard.svelte';
  import ContactBanner from '../../components/ui/ContactBanner.svelte';

  type Project = {
    slug: string;
    name: string;
    description: string;
    fields: string[];
    tags: string[];
  };

  let { data } = $props<{ data: import('./$types').PageData }>();

  const projects = $derived(
    ((data.projects ?? []) as Project[]).toSorted((a, b) => a.name.localeCompare(b.name))
  );
  // Filters are keyed by value: translated labels are empty while hydrating in production.
  const filters = ['all', 'community', 'engineering', 'research'] as const;
  const counts = $derived(
    Object.fromEntries(
      filters.map((filter) => [
        filter,
        filter === 'all'
          ? projects.length
          : projects.filter((project) => project.fields.includes(filter)).length
      ])
    )
  );
  let query = $state('');
  const activeFilter = $derived(
    (projectFields as readonly string[]).includes(page.url.searchParams.get('field') ?? '')
      ? page.url.searchParams.get('field')!
      : 'all'
  );
  function setFilter(field: string) {
    const url = new URL(page.url);
    if (field === 'all') url.searchParams.delete('field');
    else url.searchParams.set('field', field);
    return goto(url, { noScroll: true, keepFocus: true });
  }
  const filteredProjects = $derived(
    projects.filter(
      (project) =>
        (activeFilter === 'all' || project.fields.includes(activeFilter)) &&
        [project.name, project.description, ...project.fields, ...project.tags]
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

<main class="flex-1">
  <header class="border-line border-b">
    <div class="page-container py-14 md:py-20">
      <p class="eyebrow"><span class="dot"></span>Our work</p>
      <h1 class="mt-4 text-[clamp(40px,6vw,64px)] font-bold tracking-[-0.045em]">
        Projects at KSI
      </h1>
      <p class="text-muted mt-4 max-w-xl text-lg leading-relaxed">
        Software, research, and events organized by KSI members.
      </p>
    </div>
  </header>

  <section id="project-directory" class="page-container scroll-mt-20 py-10">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div class="segmented-control w-max" role="group" aria-label="Filter by field" use:slider>
          {#each filters as filter (filter)}
            <button
              type="button"
              class="bg-transparent shadow-none"
              aria-pressed={activeFilter === filter}
              onclick={() => void setFilter(filter)}
            >
              {#if filter === 'all'}All projects{:else}<FieldName field={filter} />{/if}
              <span class="text-muted font-mono text-[10px]">{counts[filter]}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="relative w-full md:max-w-xs">
        <Search
          class="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          class="mb-0 pl-9"
          placeholder="Search projects..."
          aria-label="Search projects..."
          bind:value={query}
        />
      </div>
    </div>

    <p class="text-muted mt-5 mb-5 font-mono text-[11px]" aria-live="polite">
      Showing {filteredProjects.length} of {projects.length} projects
    </p>

    {#if filteredProjects.length}
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredProjects as project (project.slug)}
          <ProjectCard {project} />
        {/each}
      </div>
    {:else}
      <div class="border-input rounded-xl border border-dashed px-6 py-14 text-center">
        <SearchX class="text-muted mx-auto mb-4 size-6" aria-hidden="true" />
        <h2 class="text-lg">No matching projects.</h2>
        <p class="text-muted mt-1.5 text-sm">Try another search or explore a different field.</p>
        <button
          class="btn btn-outline mt-6"
          type="button"
          onclick={() => {
            query = '';
            void setFilter('all');
          }}
        >
          <X /> Clear filters
        </button>
      </div>
    {/if}
  </section>

  <div class="page-container pb-20">
    <ContactBanner />
  </div>
</main>
