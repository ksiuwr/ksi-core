<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import { SquareArrowOutUpRight } from '@lucide/svelte';
</script>

<Wrapper name="projects/ket.md">
  <div
    class="markdown-file flex flex-col gap-8 py-8 pl-px md:pl-16 max-w-4xl mx-auto text-base-content"
  >
    <header class="flex flex-col gap-4 pb-8">
      <!-- @wc-ignore -->
      <h1>KET</h1>
      <a
        class="btn btn-outline w-min whitespace-nowrap"
        href="https://forms.gle/do7yFM1py8SsKeXd9"
        target="_blank"
      >
        <SquareArrowOutUpRight class="size-4" />
        Join us
      </a>
    </header>

    <div class="space-y-12">
      <section class="space-y-6">
        <p class="text-balance">
          The KET project focuses on pure quantum algorithmics, moving computation modeling to a
          level of abstraction familiar from classical software engineering. It allows you to learn
          and run code on a real quantum processor without requiring advanced knowledge of physics,
          optics, or cryogenics. The development path leads from the basics of qubit operation and
          cryptography in the Qiskit environment, through complexity theory, to variational
          optimization methods. In the final phase, participants face the challenges of modern
          hardware, learning advanced error-correcting codes, magic state distillation, and Quantum
          Machine Learning.
        </p>
      </section>

      <img src="/projects/ket/plakat.webp" alt="" />

      <section class="space-y-6 w-full">
        <h2>Goals</h2>

        <div class="flex flex-col gap-4 w-full">
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
      </section>

      <section class="space-y-4">
        <h2>Team Members</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
          <!-- @wc-ignore -->
          {#each ['Dawid Stadnik', 'Igor Nowicki', 'Jakub Horn', 'Julia Zbińska', 'Magdalena Majda', 'Maja Skóra', 'Piotr Wdowiak'] as member, i (i)}
            <div
              class="flex items-center gap-3 px-4 py-3 rounded bg-base-200/30 border border-base-content/5 hover:border-base-content/20 transition-colors cursor-default"
            >
              <span class="text-base-content/30 font-bold select-none">{i + 1}.</span>
              <span class="text-base-content/90 tracking-wide font-medium">{member}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
</Wrapper>
