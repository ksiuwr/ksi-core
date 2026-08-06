<script lang="ts">
  import { ArrowLeft, ArrowUpRight, Bot, FlaskConical } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
</script>

<Wrapper name="projects / machine learning">
  <header
    class="grid gap-8 border-b border-base-content/15 pb-14 lg:grid-cols-[1fr_0.75fr] lg:items-end"
  >
    <div>
      <a
        href="/projects"
        class="mb-8 flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/45 hover:text-primary"
      >
        <ArrowLeft class="size-4" /> All projects
      </a>
      <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">Research group</p>
      <h1 class="mb-0! text-5xl leading-[0.95]! tracking-tighter md:text-7xl">Machine learning</h1>
    </div>
    <p class="max-w-xl text-lg leading-relaxed text-base-content/65">
      We explore learning systems through projects spanning game intelligence and biologically
      inspired computation.
    </p>
  </header>

  <section class="py-14 lg:py-20">
    <div class="grid gap-px border border-base-content/15 bg-base-content/15 lg:grid-cols-2">
      <a
        href="/projects/ml/krasnal"
        class="group flex min-h-96 flex-col bg-base-100 p-7 transition-colors hover:bg-secondary/8 md:p-10"
      >
        <div class="flex items-start justify-between">
          <Bot class="size-9 text-secondary" strokeWidth={1.5} />
          <ArrowUpRight
            class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-secondary"
          />
        </div>
        <div class="mt-auto pt-20">
          <p class="mb-3 text-xs font-bold uppercase tracking-widest text-base-content/40">
            Chess · Transformers
          </p>
          <h2 class="mb-4! text-4xl tracking-tight">Krasnal</h2>
          <p class="max-w-lg leading-relaxed text-base-content/60">
            A chess engine trained to generate legal, strong moves that resemble human play.
          </p>
        </div>
      </a>

      <a
        href="/projects/ml/physarum"
        class="group flex min-h-96 flex-col bg-base-100 p-7 transition-colors hover:bg-accent/8 md:p-10"
      >
        <div class="flex items-start justify-between">
          <FlaskConical class="size-9 text-accent" strokeWidth={1.5} />
          <ArrowUpRight
            class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
          />
        </div>
        <div class="mt-auto pt-20">
          <p class="mb-3 text-xs font-bold uppercase tracking-widest text-base-content/40">
            Biology · Neural networks
          </p>
          <h2 class="mb-4! text-4xl tracking-tight">Physarum</h2>
          <p class="max-w-lg leading-relaxed text-base-content/60">
            Research into slime-mold behavior and its potential use in computational tasks.
          </p>
        </div>
      </a>
    </div>
  </section>
</Wrapper>
