<script lang="ts">
	import { File, Star } from '@lucide/svelte';
	import Gallery from '../../components/Gallery.svelte';
	import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet starIcon()}
	<Star class="size-4" />
{/snippet}

<Wrapper name="ZOSIA.md" textClassName="text-primary font-bold" icon={starIcon}>
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
</Wrapper>
