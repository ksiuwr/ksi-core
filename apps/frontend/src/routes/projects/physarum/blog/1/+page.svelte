<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import Goal from '../../../../../components/Goal.svelte';
	import Wrapper from '../../../../../components/Wrapper.svelte';
</script>

<Wrapper name="projects/physarum.md">
	<div
		class="markdown-file mx-auto flex max-w-4xl flex-col gap-8 py-8 pl-12 pr-4 text-base-content md:pl-16 md:px-2"
	>
		<header class="flex flex-col gap-2 pb-8">
			<h1>Czy Śluzowiec potrafi trenować Sieci Neuronowe?</h1>

			<p class="!my-0 font-mono !text-lg !text-base-content/60">// Biologia obliczeniowa & AI</p>
		</header>

		<div class="space-y-12">
			<section class="space-y-6">
				<figure class="flex flex-col gap-3">
					<div class="overflow-hidden rounded-md border border-base-content/10 bg-base-200/20">
						<img
							class="w-full object-cover duration-500 hover:scale-[1.01] transition-transform"
							src="/projects/physarum/graphic1.webp"
							alt="Wizualizacja U-Matrix"
						/>
					</div>
					<figcaption class="text-center font-mono text-xs text-base-content/40">
						![Wizualizacja U-Matrix, Hit Map i Wektorów wag](/graphic1.webp)
					</figcaption>
				</figure>

				<p class="text-justify">
					Ten projekt bada fascynujące skrzyżowanie biologii i informatyki, sprawdzając, czy
					naturalne procesy <em class="font-serif italic text-base-content"
						>Physarum polycephalum</em
					>
					mogą zostać wykorzystane do wykonywania zadań obliczeniowych, takich jak trenowanie sieci neuronowych.
				</p>
			</section>

			<section class="w-full space-y-6">
				<h2>Cele</h2>

				<div class="flex w-full flex-col gap-4">
					<Goal type="scientific">
						Badania behawioralne i eksperymentalne nad <em class="font-serif italic"
							>Physarum polycephalum</em
						>.
					</Goal>

					<Goal type="technical">Analiza algorytmiczna i modelowanie sieci transportowych.</Goal>

					<Goal type="social">Rozpowszechnianie wyników w środowisku akademickim i poza nim.</Goal>
				</div>
			</section>

			<section class="space-y-4">
				<h2>Członkowie Zespołu</h2>

				<div class="grid w-full grid-cols-1 gap-4 font-mono text-sm md:grid-cols-2">
					{#each ['Igor Jakus', 'Hubert Berlicki', 'Wojciech Aszkiełowicz', 'Dr Marek Adamczyk'] as member, i}
						<div
							class="flex cursor-default items-center gap-3 rounded border border-base-content/5 bg-base-200/30 px-4 py-3 transition-colors hover:border-base-content/20"
						>
							<span class="select-none font-bold text-base-content/30">{i + 1}.</span>
							<span class="font-medium tracking-wide text-base-content/90">{member}</span>
						</div>
					{/each}
				</div>
			</section>

			<!-- <section class="w-full space-y-4"> -->
			<!-- 	<h2>Posty na Blogu</h2> -->
			<!---->
			<!-- 	<div class="flex w-full flex-col gap-2 font-mono text-sm"> -->
			<!-- 		<a -->
			<!-- 			href="/projects/physarum/blog/1" -->
			<!-- 			class="group -mx-3 flex w-full flex-col rounded border border-transparent px-4 py-3 transition-colors hover:border-base-content/5 hover:bg-base-200/30 md:flex-row md:items-center md:gap-6" -->
			<!-- 		> -->
			<!-- 			<span class="min-w-[140px] shrink-0 text-base-content/40">2025-10-06</span> -->
			<!---->
			<!-- 			<span -->
			<!-- 				class="truncate font-medium text-primary decoration-primary/30 decoration-2 underline-offset-4 group-hover:underline" -->
			<!-- 			> -->
			<!-- 				Osiągnięcia Physarum polycephalum -->
			<!-- 			</span> -->
			<!---->
			<!-- 			<div -->
			<!-- 				class="ml-auto -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" -->
			<!-- 			> -->
			<!-- 				<ArrowRight class="size-4 text-base-content/50" /> -->
			<!-- 			</div> -->
			<!-- 		</a> -->
			<!-- 	</div> -->
			<!-- </section> -->
		</div>
	</div>
</Wrapper>
