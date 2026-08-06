<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import DynamicGallery from '../../../components/DynamicGallery.svelte';
  import { ArrowUpRight, CalendarDays, Clock3, MapPin, Mail } from '@lucide/svelte';

  // @wc-ignore
  const team = [
    'Agata Raczyk',
    'Bartosz Kebel',
    'Bartosz Kruszewski',
    'Emilia Wiśniewska',
    'Hania Laszkiewicz',
    'Helena Rafałowicz',
    'Karol Bednarek',
    'Kiri Goroshenko',
    'Lidia Podoluk',
    'Maksymilian Kochan',
    'Michał Kosior',
    'Michał Szwejda',
    'Piotr Wdowiak',
    'Wojciech Romanowski',
    'Yaryna Rachkevych'
  ];
</script>

<Wrapper name="projects / hour of code">
  <article class="text-base-content">
    <header
      class="grid gap-10 border-b border-base-content/15 pb-14 pt-2 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-20"
    >
      <div class="max-w-4xl">
        <p class="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Education · Python · Grades 4–8
        </p>
        <!-- @wc-ignore -->
        <h1 class="mb-0! text-5xl leading-[0.95]! tracking-[-0.055em] sm:text-6xl lg:text-8xl">
          Hour of Code
        </h1>
        <p class="mt-8 max-w-3xl text-lg leading-relaxed text-base-content/70 md:text-xl">
          The "Hour of Code" classes organized by the Computer Science Students' Club of the
          University of Wrocław introduce students to the Python programming language. They are
          intended for primary school students in grades 4-8. The classes consist of two parts:
        </p>
      </div>

      <a
        class="btn btn-primary w-fit gap-2 px-6"
        href="mailto:hourofcode.ksi@gmail.com"
        aria-label="Email the Hour of Code organizers"
      >
        <Mail class="size-4" />
        Contact us
        <ArrowUpRight class="size-4" />
      </a>
    </header>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="mb-10 grid gap-6 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">01 / Format</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Theory, then practice.</h2>
        </div>
        <div class="grid border-l border-t border-base-content/15 sm:grid-cols-2">
          <div class="border-b border-r border-base-content/15 p-6">
            <span class="mb-8 block text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              Part 01
            </span>
            <h3 class="mb-3! text-xl">Lecture</h3>
            <p class="leading-relaxed text-base-content/70">
              The basics of programming in <span class="text-secondary">Python</span> will be presented
              in an interactive, accessible, yet academic way.
            </p>
          </div>
          <div class="border-b border-r border-base-content/15 p-6">
            <span class="mb-8 block text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Part 02
            </span>
            <h3 class="mb-3! text-xl">Exercises</h3>
            <p class="leading-relaxed text-base-content/70">
              With the help of volunteers, computer science students, the pupils will independently
              solve programming tasks in computer labs.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            02 / Schedule
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Event schedule</h2>
        </div>
        <div class="max-w-3xl space-y-6 text-lg leading-relaxed text-base-content/75">
          <p>
            We will start with a lecture where students will get acquainted with the theory: they
            will learn how to run the environment and write simple programs in Python, using
            standard input and output, basic data types, and conditional statements. Then they will
            learn about more advanced constructs like loops or functions. They will also have the
            opportunity to see interesting projects encouraging further learning.
          </p>
          <p>
            After a break and a sweet treat, students will be able to put newly learned concepts
            into practice during the lab session by solving tasks independently. Volunteers will be
            present at the lab, ready to help the participants. The estimated total duration of the
            workshops is about 3 hours.
          </p>
        </div>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            03 / Why join
          </p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Benefits of participating</h2>
        </div>
        <p class="max-w-3xl text-lg leading-relaxed text-base-content/75">
          Hour of Code is a chance for students to have their first encounter with and become
          fascinated by computer science. We try to conduct the classes in such a way that
          participants not only get to know a programming language, but also can develop their
          logical thinking and problem-solving skills.
        </p>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">04 / Details</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Organizational details</h2>
        </div>
        <div>
          <p class="mb-8 max-w-3xl text-lg leading-relaxed text-base-content/75">
            In 2026, the classes will take place on: April 10, April 24, May 4, and May 11. The
            classes are held in the lecture halls and computer labs of the Institute of Computer
            Science at the University of Wrocław, at 15 Fryderyka Joliota-Curie Street in Wrocław.
            We invite schools to register their willingness to participate in these classes by email
            at
            <a
              class="font-bold text-primary underline underline-offset-4"
              href="mailto:hourofcode.ksi@gmail.com"
            >
              hourofcode.ksi@gmail.com
            </a>
          </p>

          <dl class="grid border-l border-t border-base-content/15 md:grid-cols-3">
            <div class="border-b border-r border-base-content/15 p-5">
              <CalendarDays class="mb-7 size-5 text-primary" />
              <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
                2026 dates
              </dt>
              <dd class="leading-relaxed">April 10 · April 24<br />May 4 · May 11</dd>
            </div>
            <div class="border-b border-r border-base-content/15 p-5">
              <MapPin class="mb-7 size-5 text-primary" />
              <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
                Location
              </dt>
              <dd class="leading-relaxed">Institute of Computer Science, University of Wrocław</dd>
            </div>
            <div class="border-b border-r border-base-content/15 p-5">
              <Clock3 class="mb-7 size-5 text-primary" />
              <dt class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-base-content/45">
                Duration
              </dt>
              <dd class="leading-relaxed">About 3 hours</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">05 / Gallery</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Current edition</h2>
        </div>
        <p class="text-base-content/60">See images from Hour of Code 2026!</p>
      </div>
      <DynamicGallery id="project-hoc-current" />
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="mb-10 grid gap-5 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">06 / Archive</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Previous editions</h2>
        </div>
        <p class="max-w-3xl leading-relaxed text-base-content/70">
          Hour of Code organized by the Computer Science Students' Club of the University of Wrocław
          is already a tradition. We present selected photos from previous editions of Hour of Code
        </p>
      </div>
      <DynamicGallery id="project-hoc-past" />
    </section>

    <section class="border-b border-base-content/15 py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">07 / Purpose</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Goals</h2>
        </div>
        <Goal type="social">
          Teaching primary school students programming, presenting computer science as a field of
          work and study.
        </Goal>
      </div>
    </section>

    <section class="py-14 lg:py-20">
      <div class="grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16">
        <div>
          <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">08 / People</p>
          <h2 class="mb-0! text-3xl tracking-tight md:text-4xl">Team Members</h2>
        </div>
        <div class="grid border-l border-t border-base-content/15 sm:grid-cols-2 xl:grid-cols-3">
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
