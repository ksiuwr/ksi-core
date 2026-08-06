<script lang="ts">
  import {
    ArrowDown,
    ArrowUpRight,
    Bot,
    CodeXml,
    FlaskConical,
    GraduationCap,
    Share2
  } from '@lucide/svelte';
</script>

<div class="mx-auto max-w-7xl text-base-content">
  <header
    class="grid min-h-[70vh] items-center gap-12 border-b border-base-content/15 py-12 lg:grid-cols-[1.35fr_0.65fr] lg:py-20"
  >
    <div class="max-w-5xl">
      <div
        class="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-primary"
      >
        <span class="size-2 bg-primary"></span>
        Student research group · Wrocław
      </div>

      <h1 class="mb-0! text-5xl leading-[0.95]! tracking-[-0.06em] sm:text-6xl lg:text-8xl">
        Curious minds.<br />
        <span class="text-base-content/35">Serious projects.</span>
      </h1>

      <p class="mt-8 max-w-2xl text-lg leading-relaxed text-base-content/70 md:text-xl">
        We are the Computer Science Students’ Association at the University of Wrocław — a community
        for learning, building, and exploring what technology can do.
      </p>

      <div class="mt-10 flex flex-wrap gap-3">
        <a href="#projects" class="btn btn-primary gap-2 px-6">
          Explore our work
          <ArrowDown class="size-4" />
        </a>
        <a href="#about" class="btn btn-ghost border border-base-content/20 px-6">
          Meet the association
        </a>
      </div>
    </div>

    <div class="hidden border border-base-content/20 bg-base-200/40 lg:block" aria-hidden="true">
      <div
        class="flex items-center justify-between border-b border-base-content/15 px-4 py-3 text-xs text-base-content/50"
      >
        <div class="flex gap-1.5">
          <span class="size-2 bg-primary"></span>
          <span class="size-2 bg-secondary"></span>
          <span class="size-2 bg-accent"></span>
        </div>
        ksi@uwr:~
      </div>
      <div class="space-y-6 p-6 text-sm">
        <p><span class="text-primary">$</span> whoami</p>
        <div class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-l border-base-content/15 pl-5">
          <span class="text-base-content/40">group</span><span>KSI UWr</span>
          <span class="text-base-content/40">focus</span><span>computer science</span>
          <span class="text-base-content/40">status</span>
          <span class="flex items-center gap-2"
            ><i class="size-1.5 bg-accent"></i>always learning</span
          >
          <span class="text-base-content/40">location</span><span>room 24</span>
        </div>
        <p class="text-base-content/60">
          <span class="text-primary">$</span> build --together<span class="animate-pulse">_</span>
        </p>
      </div>
    </div>
  </header>

  <main>
    <section id="about" class="scroll-mt-24 border-b border-base-content/15 py-20 lg:py-28">
      <div class="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            01 / About us
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-5xl">
            A place to turn curiosity into practice.
          </h2>
        </div>

        <div class="space-y-6">
          <p class="max-w-3xl text-lg leading-relaxed text-base-content/75 md:text-xl">
            We are a student research group operating at the Institute of Computer Science. From
            low-level theory to practical implementations, we create space to exchange knowledge,
            experiment, and build ambitious things together.
          </p>

          <div class="grid border-l border-t border-base-content/15 sm:grid-cols-3">
            <div class="border-b border-r border-base-content/15 p-5">
              <Share2 class="mb-8 size-6 text-primary" />
              <h3 class="mb-1! text-base">Socially</h3>
              <p class="text-sm leading-relaxed text-base-content/55">
                A community that learns and grows together.
              </p>
            </div>
            <div class="border-b border-r border-base-content/15 p-5">
              <CodeXml class="mb-8 size-6 text-secondary" />
              <h3 class="mb-1! text-base">Technically</h3>
              <p class="text-sm leading-relaxed text-base-content/55">
                Ideas transformed into working systems.
              </p>
            </div>
            <div class="border-b border-r border-base-content/15 p-5">
              <FlaskConical class="mb-8 size-6 text-accent" />
              <h3 class="mb-1! text-base">Scientifically</h3>
              <p class="text-sm leading-relaxed text-base-content/55">
                Questions explored with rigor and curiosity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="projects" class="scroll-mt-24 py-20 lg:py-28">
      <div class="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            02 / Selected work
          </p>
          <h2 class="mb-0! max-w-2xl text-3xl tracking-tight md:text-5xl">
            Projects built beyond the classroom.
          </h2>
        </div>
        <a
          href="/projects"
          class="group flex w-fit items-center gap-2 text-sm font-bold hover:text-primary"
        >
          View all projects
          <ArrowUpRight
            class="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      </div>

      <div class="grid gap-px bg-base-content/15 border border-base-content/15 lg:grid-cols-2">
        <a
          href="/projects/hoc"
          class="group flex min-h-80 flex-col bg-base-100 p-6 transition-colors hover:bg-primary/8 md:p-8"
        >
          <div class="flex items-start justify-between">
            <span class="text-xs text-base-content/40">PROJECT / 01</span>
            <ArrowUpRight
              class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
            />
          </div>
          <div class="my-auto py-12">
            <GraduationCap class="mb-5 size-10 text-primary" strokeWidth={1.5} />
            <h3 class="text-3xl tracking-tight md:text-4xl">Hour of Code</h3>
          </div>
          <p class="max-w-md leading-relaxed text-base-content/60">
            Programming classes that give primary school students their first tools to create with
            code.
          </p>
        </a>

        <a
          href="/projects/ml/krasnal"
          class="group flex min-h-80 flex-col bg-base-100 p-6 transition-colors hover:bg-secondary/8 md:p-8"
        >
          <div class="flex items-start justify-between">
            <span class="text-xs text-base-content/40">PROJECT / 02</span>
            <ArrowUpRight
              class="size-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-secondary"
            />
          </div>
          <div class="my-auto py-12">
            <Bot class="mb-5 size-10 text-secondary" strokeWidth={1.5} />
            <h3 class="text-3xl tracking-tight md:text-4xl">Krasnal</h3>
          </div>
          <p class="max-w-md leading-relaxed text-base-content/60">
            A chess engine that uses the Transformer architecture to learn a more intuitive way to
            play.
          </p>
        </a>
      </div>
    </section>
  </main>
</div>
