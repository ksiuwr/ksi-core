<script>
  import Wrapper from '../../../../components/Wrapper.svelte';
  import Goal from '../../../../components/Goal.svelte';
  import { Binary, Microscope, Network } from '@lucide/svelte';

  // @wc-ignore
  const team = ['Igor Jakus', 'Hubert Berlicki', 'Wojciech Aszkiełowicz', 'Dr Marek Adamczyk'];
</script>

<Wrapper name="projects / ml / physarum">
  <article class="text-base-content">
    <header class="border-b border-base-content/15 pb-14 pt-2 lg:pb-20">
      <div class="max-w-5xl">
        <p class="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Computational Biology & AI
        </p>
        <h1 class="mb-0! text-5xl leading-[0.95]! tracking-[-0.055em] sm:text-6xl lg:text-8xl">
          Can a Slime Mold<br />train Neural Networks?
        </h1>
        <p class="mt-8 max-w-3xl text-lg leading-relaxed text-base-content/70 md:text-xl">
          This project explores the fascinating intersection of biology and computer science,
          testing whether the natural processes of <em class="font-serif italic text-base-content"
            >Physarum polycephalum</em
          > can be used to perform computational tasks, such as training neural networks.
        </p>
      </div>
    </header>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">01 / Question</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">
            A biological route to computation.
          </h2>
        </div>
        <dl class="grid border-l border-t border-base-content/15 sm:grid-cols-3">
          <div class="border-b border-r border-base-content/15 p-5">
            <Microscope class="mb-8 size-6 text-accent" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Organism
            </dt>
            <dd><em class="font-serif italic">Physarum polycephalum</em></dd>
          </div>
          <div class="border-b border-r border-base-content/15 p-5">
            <Binary class="mb-8 size-6 text-accent" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Intersection
            </dt>
            <dd>Biology and computer science</dd>
          </div>
          <div class="border-b border-r border-base-content/15 p-5">
            <Network class="mb-8 size-6 text-accent" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Technical focus
            </dt>
            <dd>Algorithmic modeling of transport networks</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="mb-10 grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            02 / Research view
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Mapping the model.</h2>
        </div>
        <p class="max-w-2xl leading-relaxed text-base-content/65">
          A visual view of the U-Matrix, activation frequency, and learned weight vectors.
        </p>
      </div>

      <figure class="border border-base-content/15 bg-base-200/20 p-3 md:p-5">
        <div class="overflow-x-auto bg-black">
          <img
            class="mx-auto block h-auto min-w-160 object-contain"
            src="/projects/physarum/graphic1.webp"
            alt="Three-panel visualization showing a U-Matrix heatmap, a neuron activation hit map, and neuron weight vectors"
          />
        </div>
        <figcaption
          class="mt-4 grid gap-2 border-t border-base-content/15 pt-4 sm:grid-cols-[auto_1fr]"
        >
          <span class="text-xs font-bold text-accent">FIG. 01</span>
          <span class="text-sm leading-relaxed text-base-content/60">
            Visualization of U-Matrix, Hit Map, and Weight Vectors
          </span>
        </figcaption>
      </figure>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">
            03 / Direction
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Goals</h2>
        </div>
        <div class="space-y-4">
          <Goal type="scientific">
            Behavioral and experimental research on <em class="font-serif italic"
              >Physarum polycephalum</em
            >.
          </Goal>
          <Goal type="technical">Algorithmic analysis and modeling of transport networks.</Goal>
          <Goal type="social">Disseminating results within and beyond the academic community.</Goal>
        </div>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent">04 / People</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Team Members</h2>
        </div>
        <div class="grid border-l border-t border-base-content/15 sm:grid-cols-2">
          <!-- @wc-ignore -->
          {#each team as member, i (member)}
            <div
              class="flex min-h-16 items-center gap-4 border-b border-r border-base-content/15 p-4"
            >
              <span class="text-xs font-bold text-base-content/30"
                >{String(i + 1).padStart(2, '0')}</span
              >
              <span class="font-medium tracking-tight">{member}</span>
            </div>
          {/each}
        </div>
      </div>
    </section>
  </article>
</Wrapper>
