<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
  import DynamicGallery from '../../../components/DynamicGallery.svelte';
</script>

<Wrapper name="projects/hoc.md">
  <div class="flex flex-col gap-8 py-8 pl-px md:pl-8 text-base-content">
    <!-- @wc-ignore -->
    <h1>Hour of Code</h1>

    <p>
      The "Hour of Code" classes organized by the Computer Science Students' Club of the University
      of Wrocław introduce students to the Python programming language. They are intended for
      primary school students in grades 4-8. The classes consist of two parts:
    </p>
    <div class="flex flex-col lg:flex-row gap-4">
      <div class="p-4 border border-secondary/20 bg-secondary/10">
        <h2 class="font-bold text-secondary">Lecture</h2>
        <p>
          The basics of programming in <span class="text-secondary">Python</span> will be presented in
          an interactive, accessible, yet academic way.
        </p>
      </div>
      <div class="p-4 border border-primary/20 bg-primary/10">
        <h2 class="font-bold text-primary">Exercises</h2>
        <p>
          With the help of volunteers, computer science students, the pupils will independently
          solve programming tasks in computer labs.
        </p>
      </div>
    </div>

    <section class="space-y-6 w-full">
      <h2>Event schedule</h2>
      <p>
        We will start with a lecture where students will get acquainted with the theory: they will
        learn how to run the environment and write simple programs in Python, using standard input
        and output, basic data types, and conditional statements. Then they will learn about more
        advanced constructs like loops or functions. They will also have the opportunity to see
        interesting projects encouraging further learning.
      </p>
      <p>
        After a break and a sweet treat, students will be able to put newly learned concepts into
        practice during the lab session by solving tasks independently. Volunteers will be present
        at the lab, ready to help the participants. The estimated total duration of the workshops is
        about 3 hours.
      </p>
    </section>
    <section class="space-y-6 w-full">
      <h2>Benefits of participating</h2>
      <p>
        Hour of Code is a chance for students to have their first encounter with and become
        fascinated by computer science. We try to conduct the classes in such a way that
        participants not only get to know a programming language, but also can develop their logical
        thinking and problem-solving skills.
      </p>
    </section>

    <section class="space-y-6 w-full">
      <h2>Organizational details</h2>
      <p>
        In 2026, the classes will take place on: April 10, April 24, May 4, and May 11. The classes
        are held in the lecture halls and computer labs of the Institute of Computer Science at the
        University of Wrocław, at 15 Fryderyka Joliota-Curie Street in Wrocław. We invite schools to
        register their willingness to participate in these classes by email at <span
          class="text-primary">hourofcode.ksi [at] gmail.com</span
        >
      </p>
    </section>
    <section class="space-y-6 w-full">
      <h2>Current edition</h2>
      <p>See images from Hour of Code 2026!</p>

      <DynamicGallery id="project-hoc-current" />
    </section>

    <section class="space-y-6 w-full">
      <h2>Previous editions</h2>
      <p>
        Hour of Code organized by the Computer Science Students' Club of the University of Wrocław
        is already a tradition. We present selected photos from previous editions of Hour of Code
      </p>

      <DynamicGallery id="project-hoc-past" />
    </section>

    <section class="space-y-6 w-full">
      <h2>Goals</h2>

      <div class="flex flex-col gap-4 w-full">
        <Goal type="social"
          >Teaching primary school students programming, presenting computer science as a field of
          work and study.</Goal
        >
      </div>
    </section>

    <section class="space-y-4">
      <h2>Team Members</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
        <!-- @wc-ignore -->
        {#each ['Agata Raczyk', 'Bartosz Kebel', 'Bartosz Kruszewski', 'Emilia Wiśniewska', 'Hania Laszkiewicz', 'Helena Rafałowicz', 'Karol Bednarek', 'Kiri Goroshenko', 'Lidia Podoluk', 'Maksymilian Kochan', 'Michał Kosior', 'Michał Szwejda', 'Piotr Wdowiak', 'Wojciech Romanowski', 'Yaryna Rachkevych'] as member, i (i)}
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
</Wrapper>
