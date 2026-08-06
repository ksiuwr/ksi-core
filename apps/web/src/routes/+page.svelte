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

<div class="text-base-content mx-auto max-w-7xl">
  <header
    class="border-base-content/15 grid min-h-[70vh] items-center gap-12 border-b py-12 lg:grid-cols-[1.35fr_0.65fr] lg:py-20"
  >
    <div class="max-w-5xl">
      <div
        class="text-primary mb-8 flex items-center gap-3 text-xs font-bold tracking-[0.2em] uppercase"
      >
        <span class="bg-primary size-2"></span>
        Student research group · Wrocław
      </div>

      <h1
        class="mb-0! max-w-4xl text-5xl leading-[0.95]! tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl"
      >
        Curiosity, applied.
      </h1>

      <p class="text-base-content/70 mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
        We are the Computer Science Students’ Association at the University of Wrocław — a community
        for learning, building, and exploring what technology can do.
      </p>

      <div class="mt-10 flex flex-wrap gap-3">
        <a href="#projects" class="btn btn-primary gap-2 px-6">
          Explore our work
          <ArrowDown class="size-4" />
        </a>
        <a href="#about" class="btn btn-ghost border-base-content/20 border px-6">
          Meet the association
        </a>
      </div>
    </div>

    <div class="border-base-content/20 bg-base-200/40 hidden border lg:block" aria-hidden="true">
      <div
        class="border-base-content/15 text-base-content/50 flex items-center justify-between border-b px-4 py-3 text-xs"
      >
        <div class="flex gap-1.5">
          <span class="bg-primary size-2"></span>
          <span class="bg-secondary size-2"></span>
          <span class="bg-accent size-2"></span>
        </div>
        ksi@uwr:~
      </div>
      <div class="space-y-6 p-6 text-sm">
        <p><span class="text-primary">$</span> whoami</p>
        <div class="border-base-content/15 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-l pl-5">
          <span class="text-base-content/40">group</span><span>KSI UWr</span>
          <span class="text-base-content/40">focus</span><span>computer science</span>
          <span class="text-base-content/40">status</span>
          <span class="flex items-center gap-2"
            ><i class="bg-accent size-1.5"></i>always learning</span
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
    <section id="about" class="border-base-content/15 scroll-mt-24 border-b py-20 lg:py-28">
      <div class="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div>
          <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">
            01 / About us
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-5xl">
            A place to turn curiosity into practice.
          </h2>
        </div>

        <div class="space-y-6">
          <p class="text-base-content/75 max-w-3xl text-lg leading-relaxed md:text-xl">
            We are a student research group operating at the Institute of Computer Science. From
            low-level theory to practical implementations, we create space to exchange knowledge,
            experiment, and build ambitious things together.
          </p>

          <div class="border-base-content/15 grid border-t border-l sm:grid-cols-3">
            <div class="border-base-content/15 border-r border-b p-5">
              <Share2 class="text-primary mb-8 size-6" />
              <h3 class="mb-1! text-base">Socially</h3>
              <p class="text-base-content/55 text-sm leading-relaxed">
                A community that learns and grows together.
              </p>
            </div>
            <div class="border-base-content/15 border-r border-b p-5">
              <CodeXml class="text-secondary mb-8 size-6" />
              <h3 class="mb-1! text-base">Technically</h3>
              <p class="text-base-content/55 text-sm leading-relaxed">
                Ideas transformed into working systems.
              </p>
            </div>
            <div class="border-base-content/15 border-r border-b p-5">
              <FlaskConical class="text-accent mb-8 size-6" />
              <h3 class="mb-1! text-base">Scientifically</h3>
              <p class="text-base-content/55 text-sm leading-relaxed">
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
          <p class="text-primary mb-4 text-xs font-bold tracking-[0.2em] uppercase">
            02 / Selected work
          </p>
          <h2 class="mb-0! max-w-2xl text-3xl tracking-tight md:text-5xl">
            Projects built beyond the classroom.
          </h2>
        </div>
        <a
          href="/projects"
          class="group hover:text-primary flex w-fit items-center gap-2 text-sm font-bold"
        >
          View all projects
          <ArrowUpRight
            class="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </div>

      <div class="bg-base-content/15 border-base-content/15 grid gap-px border lg:grid-cols-2">
        <a
          href="/projects/hoc"
          class="group bg-base-100 hover:bg-primary/8 flex min-h-80 flex-col p-6 transition-colors md:p-8"
        >
          <div class="flex items-start justify-between">
            <span class="text-base-content/40 text-xs">PROJECT / 01</span>
            <ArrowUpRight
              class="group-hover:text-primary size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
          <div class="my-auto py-12">
            <GraduationCap class="text-primary mb-5 size-10" strokeWidth={1.5} />
            <h3 class="text-3xl tracking-tight md:text-4xl">Hour of Code</h3>
          </div>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            Programming classes that give primary school students their first tools to create with
            code.
          </p>
        </a>

        <a
          href="/projects/ml/krasnal"
          class="group bg-base-100 hover:bg-secondary/8 flex min-h-80 flex-col p-6 transition-colors md:p-8"
        >
          <div class="flex items-start justify-between">
            <span class="text-base-content/40 text-xs">PROJECT / 02</span>
            <ArrowUpRight
              class="group-hover:text-secondary size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </div>
          <div class="my-auto py-12">
            <Bot class="text-secondary mb-5 size-10" strokeWidth={1.5} />
            <h3 class="text-3xl tracking-tight md:text-4xl">Krasnal</h3>
          </div>
          <p class="text-base-content/60 max-w-md leading-relaxed">
            A chess engine that uses the Transformer architecture to learn a more intuitive way to
            play.
          </p>
        </a>
      </div>
    </section>
  </main>
</div>
