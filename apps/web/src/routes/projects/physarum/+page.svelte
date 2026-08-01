<script>
  import Wrapper from '../../../components/Wrapper.svelte';
  import Goal from '../../../components/Goal.svelte';
</script>

<Wrapper name="projects/physarum.md">
  <div
    class="markdown-file flex flex-col gap-8 py-8 pl-px md:pl-16 max-w-4xl mx-auto text-base-content"
  >
    <header class="flex flex-col gap-2 pb-8">
      <h1>Can a Slime Mold train Neural Networks?</h1>

      <p class="text-lg! text-base-content/60! font-mono my-0!">// Computational Biology & AI</p>
    </header>

    <div class="space-y-12">
      <section class="space-y-6">
        <figure class="flex flex-col gap-3">
          <div class="overflow-hidden rounded-md border border-base-content/10 bg-base-200/20">
            <img
              class="w-full object-cover transition-transform hover:scale-[1.01] duration-500"
              src="/projects/physarum/graphic1.webp"
              alt="Wizualizacja U-Matrix"
            />
          </div>
          <figcaption class="font-mono text-xs text-base-content/40 text-center">
            Visualization of U-Matrix, Hit Map, and Weight Vectors
          </figcaption>
        </figure>

        <p class="text-balance">
          This project explores the fascinating intersection of biology and computer science,
          testing whether the natural processes of <em class="italic text-base-content font-serif"
            >Physarum polycephalum</em
          > can be used to perform computational tasks, such as training neural networks.
        </p>
      </section>

      <section class="space-y-6 w-full">
        <h2>Goals</h2>

        <div class="flex flex-col gap-4 w-full">
          <Goal type="scientific">
            Behavioral and experimental research on <em class="italic font-serif"
              >Physarum polycephalum</em
            >.
          </Goal>

          <Goal type="technical">Algorithmic analysis and modeling of transport networks.</Goal>

          <Goal type="social">Disseminating results within and beyond the academic community.</Goal>
        </div>
      </section>

      <section class="space-y-4">
        <h2>Team Members</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
          <!-- @wc-ignore -->
          {#each ['Igor Jakus', 'Hubert Berlicki', 'Wojciech Aszkiełowicz', 'Dr Marek Adamczyk'] as member, i (i)}
            <div
              class="flex items-center gap-3 px-4 py-3 rounded bg-base-200/30 border border-base-content/5 hover:border-base-content/20 transition-colors cursor-default"
            >
              <span class="text-base-content/30 font-bold select-none">{i + 1}.</span>
              <span class="text-base-content/90 tracking-wide font-medium">{member}</span>
            </div>
          {/each}
        </div>
      </section>

      <!--
			<section class="space-y-4 w-full">
				<h2>Posty na Blogu</h2>

				<div class="flex flex-col gap-2 font-mono text-sm w-full">
					<a
						href="/projects/physarum/blog/1"
						class="group flex flex-col md:flex-row md:items-center gap-2 md:gap-6 py-3 px-4 -mx-3 rounded hover:bg-base-200/30 transition-colors w-full border border-transparent hover:border-base-content/5"
					>
						<span class="text-base-content/40 shrink-0 min-w-[140px]">2025-10-06</span>
						<span
							class="font-medium text-primary group-hover:underline decoration-2 underline-offset-4 decoration-primary/30 truncate"
						>
							Osiągnięcia Physarum polycephalum
						</span>

						<div
							class="ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
						>
							<ArrowRight class="size-4 text-base-content/50" />
						</div>
					</a>
				</div>
			</section>
      --->
    </div>
  </div>
</Wrapper>
