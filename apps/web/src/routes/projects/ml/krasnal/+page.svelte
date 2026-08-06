<script>
  import Wrapper from '../../../../components/Wrapper.svelte';
  import Goal from '../../../../components/Goal.svelte';
  import { Bot, Github, Network, Swords } from '@lucide/svelte';

  // @wc-ignore
  const team = [
    'Igor Jakus',
    'Wojciech Aszkiełowicz',
    'Hubert Berlicki',
    'Jakub Kowalczyk',
    'Kyrylo Goroshenko',
    'Olivia Szymanowska',
    'Jakub Sroka'
  ];
</script>

<Wrapper name="projects / ml / krasnal">
  <article class="text-base-content">
    <header
      class="grid gap-10 border-b border-base-content/15 pb-14 pt-2 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-20"
    >
      <div class="max-w-4xl">
        <p class="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Machine learning · Chess
        </p>
        <h1 class="mb-0! text-5xl leading-[0.95]! tracking-[-0.055em] sm:text-6xl lg:text-8xl">
          Krasnal<br />Chess Engine <span aria-hidden="true">♟️</span>
        </h1>
        <p class="mt-8 max-w-3xl text-lg leading-relaxed text-base-content/70 md:text-xl">
          Krasnal is a chess engine developed in Wrocław, based on the Transformer architecture. It
          utilizes deep neural networks to learn to play chess intuitively, departing from
          traditional, heavy calculations and game tree searching.
        </p>
      </div>

      <a
        class="btn btn-outline w-fit gap-2 border-base-content/30 px-6"
        href="https://github.com/KSI-ML-research/krasnal"
        target="_blank"
        rel="noopener"
      >
        <Github class="size-4" />
        GitHub
      </a>
    </header>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            01 / Approach
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">
            Intuition over exhaustive search.
          </h2>
        </div>
        <dl class="grid border-l border-t border-base-content/15 sm:grid-cols-3">
          <div class="border-b border-r border-base-content/15 p-5">
            <Bot class="mb-8 size-6 text-secondary" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Model
            </dt>
            <dd>Transformer architecture</dd>
          </div>
          <div class="border-b border-r border-base-content/15 p-5">
            <Network class="mb-8 size-6 text-secondary" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Method
            </dt>
            <dd>Deep neural networks</dd>
          </div>
          <div class="border-b border-r border-base-content/15 p-5">
            <Swords class="mb-8 size-6 text-secondary" strokeWidth={1.5} />
            <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
              Aim
            </dt>
            <dd>Strong, human-like chess moves</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="mb-10 grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            02 / Architecture
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">System architecture</h2>
        </div>
        <p class="max-w-2xl leading-relaxed text-base-content/65">
          Three views of Krasnal's notation, Transformer model, and direct move-prediction approach.
        </p>
      </div>

      <div class="grid gap-px border border-base-content/15 bg-base-content/15 lg:grid-cols-2">
        <figure class="bg-base-100 p-4 md:p-6 lg:col-span-2">
          <div class="flex min-h-64 items-center justify-center bg-white p-3 md:p-6">
            <img
              class="h-auto max-h-[34rem] w-full object-contain"
              src="/projects/krasnal/1.webp"
              alt="Diagram comparing ambiguous standard UCI chess notation with Krasnal's color-aware tokenization"
            />
          </div>
          <figcaption
            class="mt-4 grid gap-2 border-t border-base-content/15 pt-4 sm:grid-cols-[auto_1fr]"
          >
            <span class="text-xs font-bold text-secondary">FIG. 01</span>
            <span class="text-sm leading-relaxed text-base-content/60">
              Color-aware Krasnal tokenization compared with standard UCI notation.
            </span>
          </figcaption>
        </figure>

        <figure class="bg-base-100 p-4 md:p-6">
          <div class="flex min-h-80 items-center justify-center bg-white p-3 md:p-6">
            <img
              class="h-auto max-h-[38rem] w-full object-contain"
              src="/projects/krasnal/2.webp"
              alt="Transformer architecture diagram showing token embedding, attention and feed-forward layers, normalization, and output logits"
            />
          </div>
          <figcaption
            class="mt-4 grid gap-2 border-t border-base-content/15 pt-4 sm:grid-cols-[auto_1fr]"
          >
            <span class="text-xs font-bold text-secondary">FIG. 02</span>
            <span class="text-sm leading-relaxed text-base-content/60">
              Transformer flow from input tokens to output logits.
            </span>
          </figcaption>
        </figure>

        <figure class="bg-base-100 p-4 md:p-6">
          <div class="flex min-h-80 items-center justify-center bg-white p-3 md:p-6">
            <img
              class="h-auto max-h-[38rem] w-full object-contain"
              src="/projects/krasnal/3.webp"
              alt="Diagram comparing Stockfish's explicit search tree with Krasnal's Transformer-based direct next-move prediction"
            />
          </div>
          <figcaption
            class="mt-4 grid gap-2 border-t border-base-content/15 pt-4 sm:grid-cols-[auto_1fr]"
          >
            <span class="text-xs font-bold text-secondary">FIG. 03</span>
            <span class="text-sm leading-relaxed text-base-content/60">
              Traditional explicit search compared with Krasnal's direct prediction.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            03 / Direction
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Goals</h2>
        </div>
        <div>
          <p class="mb-8 max-w-3xl text-lg leading-relaxed text-base-content/75">
            Krasnal's goal is to generate strong, yet human-like chess moves. Balancing between the
            intuition known from the Maia Chess project and the playing strength of Stockfish.
          </p>
          <div class="space-y-4">
            <Goal type="scientific">
              Investigating the model's behavior depending on the training method.
            </Goal>
            <Goal type="technical">
              Training a model that generates legal and strong chess moves resembling human play.
            </Goal>
          </div>
        </div>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">
            04 / People
          </p>
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
