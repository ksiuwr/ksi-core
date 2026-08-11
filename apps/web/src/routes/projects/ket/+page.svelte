<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import { Atom, Cpu, SquareArrowOutUpRight } from '@lucide/svelte';

  // @wc-ignore
  const team = [
    'Dawid Stadnik',
    'Igor Nowicki',
    'Jakub Horn',
    'Julia Zbińska',
    'Magdalena Majda',
    'Maja Skóra',
    'Piotr Wdowiak'
  ];
</script>

<Wrapper name="projects / ket">
  <article class="text-base-content">
    <header
      class="border-base-content/15 grid gap-10 border-b pt-2 pb-14 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-20"
    >
      <div class="max-w-4xl">
        <p class="text-primary mb-5 text-xs font-bold tracking-[0.2em] uppercase">
          Quantum algorithms · Qiskit
        </p>
        <!-- @wc-ignore -->
        <h1 class="mb-0! text-6xl leading-[0.9]! tracking-[-0.06em] sm:text-7xl lg:text-9xl">
          KET
        </h1>
        <p class="text-base-content/70 mt-8 max-w-3xl text-lg leading-relaxed md:text-xl">
          The KET project focuses on pure quantum algorithmics, moving computation modeling to a
          level of abstraction familiar from classical software engineering. It allows you to learn
          and run code on a real quantum processor without requiring advanced knowledge of physics,
          optics, or cryogenics. The development path leads from the basics of qubit operation and
          cryptography in the Qiskit environment, through complexity theory, to variational
          optimization methods. In the final phase, participants face the challenges of modern
          hardware, learning advanced error-correcting codes, magic state distillation, and Quantum
          Machine Learning.
        </p>
      </div>

      <a
        class="btn btn-primary w-fit gap-2 px-6"
        href="https://forms.gle/do7yFM1py8SsKeXd9"
        target="_blank"
        rel="noopener"
      >
        Join us
        <SquareArrowOutUpRight class="size-4" />
      </a>
    </header>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">01 / Project</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">From qubits to real hardware.</h2>
        </div>
        <dl class="border-base-content/15 grid border-t border-l md:grid-cols-3">
          <div class="border-base-content/15 border-r border-b p-5">
            <Atom class="text-primary mb-8 size-6" strokeWidth={1.5} />
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Starting point
            </dt>
            <dd class="leading-relaxed">Basics of qubit operation and cryptography</dd>
          </div>
          <div class="border-base-content/15 border-r border-b p-5">
            <Cpu class="text-secondary mb-8 size-6" strokeWidth={1.5} />
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Environment
            </dt>
            <dd class="leading-relaxed">Qiskit and a real quantum processor</dd>
          </div>
          <div class="border-base-content/15 border-r border-b p-5">
            <span class="text-accent mb-8 block text-2xl leading-none">Q</span>
            <dt class="text-base-content/45 mb-2 text-xs font-bold tracking-[0.16em] uppercase">
              Advanced path
            </dt>
            <dd class="leading-relaxed">
              Error correction, optimization, and Quantum Machine Learning
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
            02 / Recruitment
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Project poster</h2>
        </div>
        <figure class="border-base-content/15 bg-base-200/20 max-w-2xl border p-3 md:p-5">
          <img
            class="mx-auto block h-auto w-full"
            src="/projects/ket/plakat.webp"
            alt="KET quantum computing recruitment poster with project topics and a registration QR code"
          />
          <figcaption
            class="border-base-content/15 text-base-content/50 mt-4 border-t pt-3 text-xs tracking-[0.14em] uppercase"
          >
            KET recruitment poster
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="border-base-content/15 border-b py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">
            03 / Direction
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Goals</h2>
        </div>
        <div class="space-y-4">
          <Goal type="scientific">
            Researching innovative quantum algorithms, computational complexity theory, and quantum
            machine learning to push the boundaries of modern cybersecurity and optimization
            paradigms.
          </Goal>
          <Goal type="technical">
            Modeling computations and independently implementing proprietary quantum algorithms in
            the Qiskit environment, with the ultimate execution of the code on a real quantum
            processor.
          </Goal>
        </div>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="text-primary mb-3 text-xs font-bold tracking-[0.2em] uppercase">04 / People</p>
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
