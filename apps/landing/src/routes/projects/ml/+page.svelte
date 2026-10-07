<script lang="ts">
  import { ArrowLeft, ArrowUpRight, Bot, FlaskConical } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
</script>

<Wrapper name="projects / machine learning">
  <header
    class="border-base-content/15 grid gap-8 border-b pb-14 lg:grid-cols-[1fr_0.75fr] lg:items-end"
  >
    <div>
      <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">Research group</p>
      <h1 class="mb-0! text-5xl leading-[0.95]! tracking-tighter md:text-7xl">Machine learning</h1>
    </div>
    <p class="text-base-content/65 max-w-xl text-lg leading-relaxed">
      We explore learning systems through projects spanning game intelligence and biologically
      inspired computation.
    </p>
  </header>

  <section class="py-14 lg:py-20">
    <div class="border-base-content/15 bg-base-content/15 grid gap-px border lg:grid-cols-2">
      <a
        href="/projects/ml/krasnal"
        class="group bg-base-100 hover:bg-secondary/8 flex min-h-96 flex-col p-7 transition-colors md:p-10"
      >
        <div class="flex items-start justify-between">
          <Bot class="text-secondary size-9" strokeWidth={1.5} />
          <ArrowUpRight
            class="group-hover:text-secondary size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
          />
        </div>
        <div class="mt-auto pt-20">
          <p class="text-base-content/40 mb-3 text-xs font-bold tracking-widest uppercase">
            Chess · Transformers
          </p>
          <h2 class="mb-4! text-4xl tracking-tight">Krasnal</h2>
          <p class="text-base-content/60 max-w-lg leading-relaxed">
            A chess engine trained to generate legal, strong moves that resemble human play.
          </p>
        </div>
      </a>

      <a
        href="/projects/ml/physarum"
        class="group bg-base-100 hover:bg-accent/8 flex min-h-96 flex-col p-7 transition-colors md:p-10"
      >
        <div class="flex items-start justify-between">
          <FlaskConical class="text-accent size-9" strokeWidth={1.5} />
          <ArrowUpRight
            class="group-hover:text-accent size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
          />
        </div>
        <div class="mt-auto pt-20">
          <p class="text-base-content/40 mb-3 text-xs font-bold tracking-widest uppercase">
            Biology · Neural networks
          </p>
          <h2 class="mb-4! text-4xl tracking-tight">Physarum</h2>
          <p class="text-base-content/60 max-w-lg leading-relaxed">
            Research into slime-mold behavior and its potential use in computational tasks.
          </p>
        </div>
      </a>
    </div>
  </section>
</Wrapper>
