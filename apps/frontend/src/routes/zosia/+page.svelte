<script lang="ts">
	import { Star } from '@lucide/svelte';
	import Gallery from '../../components/Gallery.svelte';
	import Wrapper from '../../components/Wrapper.svelte';
	import { editions } from '$lib/data/conferences.js';
</script>

{#snippet starIcon()}
	<Star class="size-4" />
{/snippet}

{#snippet zosiaEdition(edition: string)}
	<a href={`/zosia/${edition}`}>
		<div class="flex flex-col py-6 items-center border border-base-300">
			<b class="text-[6rem]">{edition}</b>
		</div>
	</a>
{/snippet}

<Wrapper name="zosia/README.md" textClassName="text-primary font-bold" icon={starIcon}>
	<div class="markdown-file flex flex-col gap-4">
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
		<h1>Archiwum Zosiek</h1>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
				{@render zosiaEdition(edition)}
			{/each}
		</div>
	</div>
</Wrapper>
