<script>
  import Wrapper from '../../../../components/Wrapper.svelte';
  import Goal from '../../../../components/Goal.svelte';
  import { Binary, Microscope, Network } from '@lucide/svelte';

  // @wc-ignore
  const team = ['Igor Jakus', 'Hubert Berlicki', 'Wojciech Aszkiełowicz', 'Dr Marek Adamczyk'];
</script>

<Wrapper name="projects / ml / physarum">
  <article class="text-base-content">
    <header class="border-base-content/15 border-b pt-2 pb-14 lg:pb-20">
      <div class="max-w-5xl">
        <p class="text-accent mb-5 text-xs font-bold tracking-[0.2em] uppercase">
          Computational Biology & AI
        </p>
        <h1 class="mb-0! text-5xl leading-[0.95]! tracking-[-0.055em] sm:text-6xl lg:text-8xl">
          Can a Slime Mold<br />train Neural Networks?
        </h1>
        <p class="text-base-content/70 mt-8 max-w-3xl text-lg leading-relaxed md:text-xl">
          This project explores the fascinating intersection of biology and computer science,
          testing whether the natural processes of <em class="text-base-content font-serif italic"
            >Physarum polycephalum</em
          > can be used to perform computational tasks, such as training neural networks.
        </p>
      </div>
    </header>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-accent mb-3 text-xs font-bold tracking-[0.2em] uppercase">01 / Question</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">
            A biological route to computation.
          </h2>
        </div>
        <dl class="border-base-content/15 grid border-t border-l sm:grid-cols-3">
          <div class="border-base-content/15 border-r border-b p-5">
            <Microscope class="text-accent mb-8 size-6" strokeWidth={1.5} />
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Organism
            </dt>
            <dd><em class="font-serif italic">Physarum polycephalum</em></dd>
          </div>
          <div class="border-base-content/15 border-r border-b p-5">
            <Binary class="text-accent mb-8 size-6" strokeWidth={1.5} />
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Intersection
            </dt>
            <dd>Biology and computer science</dd>
          </div>
          <div class="border-base-content/15 border-r border-b p-5">
            <Network class="text-accent mb-8 size-6" strokeWidth={1.5} />
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Technical focus
            </dt>
            <dd>Algorithmic modeling of transport networks</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="mb-10 grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-accent mb-3 text-xs font-bold tracking-[0.2em] uppercase">
            02 / Research view
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Mapping the model.</h2>
        </div>
        <p class="text-base-content/65 max-w-2xl leading-relaxed">
          A visual view of the U-Matrix, activation frequency, and learned weight vectors.
        </p>
      </div>

      <figure class="border-base-content/15 bg-base-200/20 border p-3 md:p-5">
        <div class="overflow-x-auto bg-black">
          <img
            class="mx-auto block h-auto min-w-160 object-contain"
            src="/projects/physarum/graphic1.webp"
            alt="Three-panel visualization showing a U-Matrix heatmap, a neuron activation hit map, and neuron weight vectors"
          />
        </div>
        <figcaption
          class="border-base-content/15 mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[auto_1fr]"
        >
          <span class="text-accent text-xs font-bold">FIG. 01</span>
          <span class="text-base-content/60 text-sm leading-relaxed">
            Visualization of U-Matrix, Hit Map, and Weight Vectors
          </span>
        </figcaption>
      </figure>
    </section>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-accent mb-3 text-xs font-bold tracking-[0.2em] uppercase">
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
          <p class="text-accent mb-3 text-xs font-bold tracking-[0.2em] uppercase">04 / People</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Team Members</h2>
        </div>
        <div class="border-base-content/15 grid border-t border-l sm:grid-cols-2">
          <!-- @wc-ignore -->
          {#each team as member, i (member)}
            <div
              class="border-base-content/15 flex min-h-16 items-center gap-4 border-r border-b p-4"
            >
              <span class="text-base-content/30 text-xs font-bold"
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
