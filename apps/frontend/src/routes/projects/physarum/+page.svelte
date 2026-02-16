<script>
	import Wrapper from '../../../components/Wrapper.svelte';
</script>

<Wrapper name="projects/physarum.md">
	<div class="markdown-file flex flex-col py-10">
		<h1 class="text-4xl font-bold mb-2">Czy Śluzowiec potrafi trenować Sieci Neuronowe?</h1>

		<img
			class="self-center py-4"
			src="/projects/physarum/graphic1.webp"
			alt="Wizualizacja U-Matrix, Hit Map i Wektorów wag"
		/>

		<p>
			Ten projekt bada fascynujące skrzyżowanie biologii i informatyki, sprawdzając, czy naturalne
			procesy <em>Physarum polycephalum</em>
			mogą zostać wykorzystane do wykonywania zadań obliczeniowych, takich jak trenowanie sieci neuronowych.
		</p>
		<h2 class="text-2xl font-bold mb-4">Członkowie Zespołu</h2>
		<ul class="list-disc list-inside space-y-1 text-xl">
			<li>Igor Jakus</li>
			<li>Hubert Berlicki</li>
			<li>Wojciech Aszkiełowicz</li>
			<li>Dr Marek Adamczyk</li>
		</ul>

		<h2 class="text-2xl font-bold mb-4">Cele</h2>
		<ul class="list-disc list-inside space-y-2 text-xl">
			<li>Badania behawioralne i eksperymentalne nad Physarum polycephalum.</li>
			<li>Analiza algorytmiczna i modelowanie sieci transportowych.</li>
			<li>Rozpowszechnianie wyników w środowisku akademickim i poza nim.</li>
		</ul>
		<h2 class="text-2xl font-bold mb-4">Posty na Blogu</h2>
		<div class="space-y-4">
			<div class="flex flex-col md:flex-row md:gap-4">
				<span class="text-gray-500 min-w-[150px]">6 października, 2025</span>
				<a href="/projects/physarum/blog/1">Osiągnięcia Physarum polycephalum</a>
			</div>
		</div>
	</div>
</Wrapper>
