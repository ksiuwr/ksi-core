<script>
	import { m } from '$lib/paraglide/messages';
	import Accordion from '../../components/Accordion.svelte';
</script>

<section
	class="min-h-[60vh] flex flex-col px-4 md:px-10 lg:px-20 mt-20 justify-center bg-linear-to-b from-base-100 to-base-200"
>
	<!-- <div
		class="bg-white rounded-full size-20 lg:size-40 items-center justify-center text-center flex"
	>
		<p class="w-full text-[4.2cqw] text-base-100 font-bold">koło</p>
	</div> -->
	<!-- <div class="rounded-full size-20 lg:size-40 sticky top-80 left-0 z-10 backdrop-invert"></div> -->
	<p class="w-full text-[4.2cqw] -mt-34 font-bold">{m.lower_drab_snake_stir()}</p>
	<h1 class="text-[clamp(3rem,6cqw,9rem)] font-bold">{m.patchy_gray_squirrel_exhale()}</h1>
	<p class="text-[2vw]">{m.minor_keen_cougar_sew()}</p>
</section>
<div class="min-h-screen px-4 md:px-10 lg:px-20 py-20 bg-base-200 flex flex-col text-start gap-2">
	<p class="font-mono text-primary tracking-wider">{m.mellow_merry_termite_tickle()}</p>
	<Accordion title={m.polite_happy_mallard_fond()}>
		<p class="text-lg opacity-80 text-start leading-relaxed">
			{@html m.yummy_zany_dachshund_sail()}
		</p>
	</Accordion>
	<Accordion title="Kim jesteśmy?">
		<p class="text-lg opacity-80 text-start basis-0 leading-relaxed">
			Studentami, tak jak Ty! <br /><br />W życiu studenckim pasjonujemy się organizowaniem wydarzeń
			informatycznych, takich jak ZOSIA czy LEOSIA, inicjatywami społecznymi, oraz projektami
			technicznymi!
		</p>
	</Accordion>
	<Accordion title="Jak do Was dołączyć?">
		<p class="text-lg opacity-80 text-start basis-0 leading-relaxed">
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
	</Accordion>
</div>
