<script>
	import { File, Star } from '@lucide/svelte';
	import Gallery from '../../components/Gallery.svelte';
</script>

<section class="border border-base-200 flex flex-col px-4 mt-[60px] md:px-10 lg:px-20 py-4">
	<code class="opacity-60 flex gap-2 items-center text-primary font-bold"
		><Star class="size-4" /> ZOSIA.md</code
	>
	<div class="w-screen h-px bg-base-200 relative left-1/2 -translate-x-1/2 my-4"></div>
	<!-- <div
		class="bg-white rounded-full size-20 lg:size-40 items-center justify-center text-center flex"
	>
		<p class="w-full text-[4.2cqw] text-base-100 font-bold">koło</p>
	</div> -->
	<!-- <div class="rounded-full size-20 lg:size-40 sticky top-80 left-0 z-10 backdrop-invert"></div> -->
	<div class="markdown-file">
		<h1>ZOSIA</h1>
		<p>
			Zimowy Obóz Studentów Informatyki A, to impreza organizowana przez Koło Studentów Informatyki
			od ponad 20 lat. Historia obozu rozpoczęła się od nieformalnych wyjazdów grupy
			zaprzyjaźnionych studentów, dziś zrzesza każdego roku niemal 300 osób: studentów róznych
			uczelni, przedstawicieli świata nauki i firm z branży IT. Podczas trzydniowego wyjazdu
			odbywają się wykłady, prezentacje firm ale także wycieczki i imprezy integracyjne. ZOSIA
			tradycyjnie odbywa się na przełomie lutego i marca. Co roku agenda ZOSI wypełniona jest
			ciekawymi wykładami, wygłaszanymi zarówno przez sponsorów i wykładowców, jak i studentów
			chcących podzielić się swoimi zainteresowaniami. Choć większość wykładów dotyczy tematów
			okołoinformatycznych, nie brakuje perełek z innych dziedzin.
		</p>
		<hr />
		<h1>Galeria</h1>
		<p>Obejrzyj poprzednie edycje ZOSI uwiecznione na zdjęciach!</p>
		<h2>ZOSIA 2024</h2>
		<Gallery
			images={[
				'https://cataas.com/cat?q=1',
				'https://cataas.com/cat?q=2',
				'https://cataas.com/cat?q=3',
				'https://cataas.com/cat?q=4',
				'https://cataas.com/cat?q=5',
				'https://cataas.com/cat?q=6',
				'https://cataas.com/cat?q=7',
				'https://cataas.com/cat?q=8',
				'https://cataas.com/cat?q=9',
				'https://cataas.com/cat?q=10'
			]}
		/>
		<h2>ZOSIA 2023</h2>
		<h2>ZOSIA 2022</h2>
		<h2>ZOSIA 2021</h2>
		<h2>ZOSIA 2020</h2>
		<h2>ZOSIA 2019</h2>
	</div>
</section>
