<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import { Github } from '@lucide/svelte';
</script>

<Wrapper name="projects/krasnal.md">
  <div
    class="markdown-file flex flex-col gap-8 py-8 pl-px md:pl-16 max-w-4xl mx-auto text-base-content"
  >
    <header class="flex flex-col gap-2 pb-8">
      <h1>Krasnal Chess Engine ♟️</h1>
      <a
        class="btn btn-outline w-min"
        href="https://github.com/KSI-ML-research/krasnal"
        target="_blank"
      >
        <Github class="size-4" />
        GitHub</a
      >
    </header>

    <div class="space-y-12">
      <section class="space-y-6">
        <p class="text-balance">
          Krasnal is a chess engine developed in Wrocław, based on the Transformer architecture. It
          utilizes deep neural networks to learn to play chess intuitively, departing from
          traditional, heavy calculations and game tree searching.
        </p>
      </section>

      <section class="space-y-6 w-full">
        <h2>System architecture</h2>
        <div class="flex items-center gap-4 overflow-x-scroll h-[250px] md:h-[320pt] w-full">
          <img
            src="/projects/krasnal/1.webp"
            class="max-h-full w-auto object-contain shrink-0"
            alt=""
          />
          <img
            src="/projects/krasnal/2.webp"
            class="max-h-full w-auto object-contain shrink-0"
            alt=""
          />
          <img
            src="/projects/krasnal/3.webp"
            class="max-h-full w-auto object-contain shrink-0"
            alt=""
          />
        </div>
      </section>

      <section class="space-y-6 w-full">
        <h2>Goals</h2>

        <p class="text-balance">
          Krasnal's goal is to generate strong, yet human-like chess moves. Balancing between the
          intuition known from the Maia Chess project and the playing strength of Stockfish.
        </p>
        <div class="flex flex-col gap-4 w-full">
          <Goal type="scientific">
            Investigating the model's behavior depending on the training method.
          </Goal>

          <Goal type="technical">
            Training a model that generates legal and strong chess moves resembling human play.
          </Goal>
        </div>
      </section>

      <section class="space-y-4">
        <h2>Team Members</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
          <!-- @wc-ignore -->
          {#each ['Igor Jakus', 'Wojciech Aszkiełowicz', 'Hubert Berlicki', 'Jakub Kowalczyk', 'Kyrylo Goroshenko', 'Olivia Szymanowska', 'Jakub Sroka'] as member, i (i)}
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
