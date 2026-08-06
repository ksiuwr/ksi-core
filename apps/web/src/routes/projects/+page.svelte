<script lang="ts">
  import { ArrowUpRight, Search } from '@lucide/svelte';
  import Wrapper from '../../components/Wrapper.svelte';

  const projects = [
    {
      title: 'Hour of Code',
      category: 'Education',
      href: '/projects/hoc',
      summary:
        'Programming workshops introducing primary school students to Python and computational thinking.',
      tags: ['Python', 'Workshops', 'Community']
    },
    {
      title: 'KET',
      category: 'Quantum computing',
      href: '/projects/ket',
      summary: 'From qubit fundamentals to algorithms running on real quantum processors.',
      tags: ['Qiskit', 'Algorithms', 'Research']
    },
    {
      title: 'Krasnal',
      category: 'Machine learning',
      href: '/projects/ml/krasnal',
      summary: 'A Transformer-based chess engine learning to produce strong, human-like moves.',
      tags: ['Transformers', 'Chess', 'AI']
    },
    {
      title: 'Physarum',
      category: 'Computational biology',
      href: '/projects/ml/physarum',
      summary:
        'Exploring whether slime mold behavior can inspire methods for training neural networks.',
      tags: ['Biology', 'Networks', 'AI']
    },
    {
      title: 'ZOSIA',
      category: 'Conference',
      href: '/projects/zosia',
      summary:
        'The annual winter camp bringing together students, researchers, and the technology community.',
      tags: ['Talks', 'Community', 'Wrocław']
    }
  ];

  let query = $state('');
  let filteredProjects = $derived(
    projects.filter((project) =>
      [project.title, project.category, project.summary, ...project.tags]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
  );
</script>

<Wrapper name="projects">
  <header
    class="grid gap-8 border-b border-base-content/15 pb-14 lg:grid-cols-[1fr_0.8fr] lg:items-end"
  >
    <div>
      <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">What we build</p>
      <h1 class="mb-0! max-w-3xl text-5xl leading-[0.95]! tracking-tighter md:text-7xl">
        Projects driven by curiosity.
      </h1>
    </div>
    <p class="max-w-xl text-lg leading-relaxed text-base-content/65">
      Explore our work across education, machine learning, quantum computing, computational biology,
      and community events.
    </p>
  </header>

  <section class="py-14 lg:py-20">
    <label class="relative block max-w-xl" for="project-search">
      <span class="sr-only">Search projects</span>
      <Search
        class="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-base-content/35"
      />
      <input
        id="project-search"
        type="search"
        class="input input-lg w-full rounded-none border-base-content/20 bg-transparent pl-12"
        placeholder="Search by name, field, or technology..."
        bind:value={query}
      />
    </label>

    <div class="mt-8 grid gap-px border border-base-content/15 bg-base-content/15 md:grid-cols-2">
      {#each filteredProjects as project, index (project.href)}
        <a
          href={project.href}
          class="group flex min-h-72 flex-col bg-base-100 p-6 transition-colors hover:bg-primary/8 md:p-8"
        >
          <div
            class="flex items-start justify-between text-xs uppercase tracking-widest text-base-content/40"
          >
            <span>{String(index + 1).padStart(2, '0')} / {project.category}</span>
            <ArrowUpRight
              class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
            />
          </div>

          <div class="my-auto py-10">
            <h2 class="mb-3! text-3xl tracking-tight md:text-4xl">{project.title}</h2>
            <p class="max-w-lg leading-relaxed text-base-content/60">{project.summary}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            {#each project.tags as tag (tag)}
              <span
                class="border border-base-content/15 px-2.5 py-1 text-[0.65rem] uppercase tracking-wider text-base-content/50"
                >{tag}</span
              >
            {/each}
          </div>
        </a>
      {:else}
        <div class="col-span-full bg-base-100 px-6 py-20 text-center">
          <p class="text-lg font-bold">No matching projects.</p>
          <p class="mt-2 text-sm text-base-content/50">
            Try a different name, field, or technology.
          </p>
        </div>
      {/each}
    </div>
  </section>
</Wrapper>
