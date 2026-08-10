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
    class="border-base-content/15 grid gap-8 border-b pb-14 lg:grid-cols-[1fr_0.8fr] lg:items-end"
  >
    <div>
      <h1 class="mb-0! max-w-3xl text-5xl leading-[0.95]! tracking-tighter md:text-7xl">
        We build projects driven by curiosity
      </h1>
    </div>
    <p class="text-base-content/65 max-w-xl text-lg leading-relaxed">
      Explore our work across education, machine learning, quantum computing, computational biology,
      and community events.
    </p>
  </header>

  <section class="py-14 lg:py-20">
    <label class="relative block max-w-xl" for="project-search">
      <span class="sr-only">Search projects</span>
      <Search
        class="text-base-content/35 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
      />
      <input
        id="project-search"
        type="search"
        class="input input-lg border-base-content/20 w-full rounded-none bg-transparent pl-12"
        placeholder="Search by name, field, or technology..."
        bind:value={query}
      />
    </label>

    <div class="border-base-content/15 bg-base-content/15 mt-8 grid gap-px border md:grid-cols-2">
      {#each filteredProjects as project, index (project.href)}
        <a
          href={project.href}
          class="group bg-base-100 hover:bg-primary/8 flex min-h-72 flex-col p-6 transition-colors md:p-8"
        >
          <div
            class="text-base-content/40 flex items-start justify-between text-xs tracking-widest uppercase"
          >
            <span>{String(index + 1).padStart(2, '0')} / {project.category}</span>
            <ArrowUpRight
              class="group-hover:text-primary size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>

          <div class="my-auto py-10">
            <h2 class="mb-3! text-3xl tracking-tight md:text-4xl">{project.title}</h2>
            <p class="text-base-content/60 max-w-lg leading-relaxed">{project.summary}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            {#each project.tags as tag (tag)}
              <span
                class="border-base-content/15 text-base-content/50 border px-2.5 py-1 text-[0.65rem] tracking-wider uppercase"
                >{tag}</span
              >
            {/each}
          </div>
        </a>
      {:else}
        <div class="bg-base-100 col-span-full px-6 py-20 text-center">
          <p class="text-lg font-bold">No matching projects.</p>
          <p class="text-base-content/50 mt-2 text-sm">
            Try a different name, field, or technology.
          </p>
        </div>
      {/each}
    </div>
  </section>
</Wrapper>
