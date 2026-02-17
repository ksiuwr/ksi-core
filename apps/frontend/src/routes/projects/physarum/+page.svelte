<script>
	import Wrapper from '../../../components/Wrapper.svelte';
	import Goal from '../../../components/Goal.svelte';
	import { ArrowRight } from '@lucide/svelte';
</script>

<Wrapper name="projects/physarum.md">
	<div
		class="markdown-file flex flex-col gap-8 py-8 pl-12 md:pl-16 pr-4 max-w-4xl mx-auto text-base-content"
	>
		<header class="flex flex-col gap-2 pb-8">
			<h1>Czy Śluzowiec potrafi trenować Sieci Neuronowe?</h1>

			<p class="!text-lg !text-base-content/60 font-mono !my-0">// Biologia obliczeniowa & AI</p>
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
						Wizualizacja U-Matrix, Hit Map i Wektorów wag
					</figcaption>
				</figure>

				<p class="text-justify">
					Ten projekt bada fascynujące skrzyżowanie biologii i informatyki, sprawdzając, czy
					naturalne procesy <em class="italic text-base-content font-serif"
						>Physarum polycephalum</em
					>
					mogą zostać wykorzystane do wykonywania zadań obliczeniowych, takich jak trenowanie sieci neuronowych.
				</p>
			</section>

			<section class="space-y-6 w-full">
				<h2>Cele</h2>

				<div class="flex flex-col gap-4 w-full">
					<Goal type="scientific">
						Badania behawioralne i eksperymentalne nad <em class="italic font-serif"
							>Physarum polycephalum</em
						>.
					</Goal>

					<Goal type="technical">Analiza algorytmiczna i modelowanie sieci transportowych.</Goal>

					<Goal type="social">Rozpowszechnianie wyników w środowisku akademickim i poza nim.</Goal>
				</div>
			</section>

			<section class="space-y-4">
				<h2>Członkowie Zespołu</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
					{#each ['Igor Jakus', 'Hubert Berlicki', 'Wojciech Aszkiełowicz', 'Dr Marek Adamczyk'] as member, i}
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
