<script>
	import Wrapper from '../../../components/Wrapper.svelte';
	import Goal from '../../../components/Goal.svelte';
	import { ArrowRight } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages';
	import DynamicGallery from '../../../components/DynamicGallery.svelte';
</script>

<Wrapper name="projects/hoc.md">
	<div class="flex flex-col gap-8 py-8 pl-px md:pl-8 text-base-content">
		<h1>Hour of Code</h1>

		<p>
			Zajęcia “Hour of Code” organizowane przez Koło Studentów Informatyki Uniwersytetu
			Wrocławskiego zapoznają uczniów z językiem programowania Python. Są przeznaczone dla uczniów
			klas 4-8 szkół podstawowych. Zajęcia mają dwie części:
		</p>
		<div class="flex flex-col lg:flex-row gap-4">
			<div class="p-4 border border-primary/20 bg-primary/10">
				<h2 class="font-bold text-primary">Ćwiczenia</h2>
				<p>
					Przy pomocy wolontariuszy, studentów informatyki, uczniowie samodzielnie będą rozwiązywać
					zadania programistyczne w salach komputerowych.
				</p>
			</div>
			<div class="p-4 border border-secondary/20 bg-secondary/10">
				<h2 class="font-bold text-secondary">Wykład</h2>
				<p>
					W interaktywny, przystępny, ale jakże akademicki sposób zostaną przedstawione podstawy
					programowania w języku <span class="text-secondary">Python</span>.
				</p>
			</div>
		</div>

		<section class="space-y-6 w-full">
			<h2>Plan wydarzenia</h2>
			<p>
				Rozpoczniemy wykładem, na którym uczniowie zapoznają się z teorią: nauczą się uruchamiać
				środowisko i pisać proste programy w języku Python, wykorzystujące standardowe wejście i
				wyjście, podstawowe typy danych oraz instrukcje warunkowe. Następnie poznają bardziej
				zaawansowane konstrukcje jak pętle czy funkcje. Będą mieli także okazję zobaczyć ciekawe
				projekty, zachęcające do dalszej nauki.
			</p>
			<p>
				Po przerwie i słodkim poczęstunku uczniowie będą mogli wykorzystać nowo poznane zagadnienia
				w praktyce w trakcie pracowni, rozwiązując samodzielnie zadania. Na pracowni obecni będą
				wolontariusze, gotowi służyć pomocą uczestnikom. Przewidywany łączny czas trwania warsztatów
				to około 3 godziny.
			</p>
		</section>
		<section class="space-y-6 w-full">
			<h2>Korzyści z udziału</h2>
			<p>
				Hour of Code to szansa dla uczniów na pierwsze zetknięcie się i zafascynowanie informatyką.
				Zajęcia staramy się prowadzić tak, by uczestnicy nie tylko zapoznali się z językiem
				programowania, ale także mogli rozwinąć umiejętności logicznego myślenia i rozwiązywania
				problemów.
			</p>
		</section>

		<section class="space-y-6 w-full">
			<h2>Szczegóły organizacyjne</h2>
			<p>
				W roku 2026 zajęcia odbędą się: 10 kwietnia, 24 kwietnia, 4 maja oraz 11 maja. Zajęcia
				odbywają się w salach wykładowych i komputerowych Instytutu Informatyki Uniwersytetu
				Wrocławskiego, przy ul. Fryderyka Joliota-Curie 15 we Wrocławiu. Zapraszamy szkoły do
				zgłaszania chęci uczestnictwa w tych zajęciach mailowo na <span class="text-primary"
					>hourofcode.ksi [at] gmail.com</span
				>
			</p>
		</section>

		<section class="space-y-6 w-full">
			<h2>Poprzednie edycje</h2>
			<p>
				Hour of Code organizowany przez Koło Studentów Informatyki Uniwersytetu Wrocławskiego jest
				już tradycją. Przedstawiamy wybrane zdjęcia z poprzednich edycji Hour of Code
			</p>

			<DynamicGallery id="project-hoc" />
		</section>

		<section class="space-y-6 w-full">
			<h2>{m.clean_plane_finch_spin()}</h2>

			<div class="flex flex-col gap-4 w-full">
				<Goal type="social"
					>Nauka uczniów szkół podstawowych programowania, przedstawienie informatyki jako dziedziny
					pracy i nauki.</Goal
				>
			</div>
		</section>

		<section class="space-y-4">
			<h2>{m.last_lucky_reindeer_belong()}</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
				{#each ['Agata Raczyk', 'Bartosz Kebel', 'Bartosz Kruszewski', 'Cezary Miłek', 'Emilia Wiśniewska', 'Hania Laszkiewicz', 'Helena Rafałowicz', 'Kiri Goroshenko', 'Lidia Podoluk', 'Maksymilian Kochan', 'Michał Szwejda', 'Piotr Wdowiak', 'Szymon Fluder', 'Wojciech Romanowski'] as member, i}
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
