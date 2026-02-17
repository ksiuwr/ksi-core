<script lang="ts">
	import { Star, FolderOpen, ArrowUpRight } from '@lucide/svelte';
	import Wrapper from '../../components/Wrapper.svelte';
	import { editions } from '$lib/data/conferences.js';
	import { page } from '$app/stores';
</script>

{#snippet starIcon()}
	<Star class="size-4 text-primary" />
{/snippet}

{#snippet zosiaEdition(edition: string)}
	<a href={`/zosia/${edition}`} class="group">
		<div
			class="relative flex flex-col items-center justify-center py-10 border border-base-content/10 bg-base-200/20 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/5 overflow-hidden"
		>
			<span
				class="absolute -right-2 -bottom-4 text-9xl font-bold opacity-[0.03] select-none group-hover:text-primary group-hover:opacity-[0.07] transition-all"
			>
				{edition}
			</span>

			<div class="flex flex-col items-center gap-2 z-10">
				<span
					class="font-mono text-xs text-base-content/40 group-hover:text-primary/60 transition-colors uppercase tracking-widest"
					>Edition</span
				>
				<b
					class="text-5xl font-bold tracking-tighter text-base-content group-hover:text-primary transition-colors"
				>
					{edition}
				</b>
				<div
					class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
				>
					<span class="font-mono text-[10px] text-primary">view_archive.sh</span>
					<ArrowUpRight class="size-3 text-primary" />
				</div>
			</div>
		</div>
	</a>
{/snippet}

<Wrapper name="zosia/README.md" textClassName="text-primary font-bold" icon={starIcon}>
	<div class="markdown-file flex flex-col gap-8">
		<header class="flex flex-col gap-2 border-b border-base-content/10 pb-8">
			<h1>ZOSIA</h1>
			<p class="!text-lg !text-base-content/60 font-mono !my-0">
				// Zimowy Obóz Studentów Informatyki
			</p>
		</header>

		<section class="max-w-4xl">
			<p>
				Zimowy Obóz Studentów Informatyki, to impreza organizowana przez Koło Studentów Informatyki
				od ponad 20 lat. Historia obozu rozpoczęła się od nieformalnych wyjazdów grupy
				zaprzyjaźnionych studentów, dziś zrzesza każdego roku niemal 300 osób: studentów różnych
				uczelni, przedstawicieli świata nauki i firm z branży IT.
			</p>
			<p class="mt-4">
				Podczas trzydniowego wyjazdu odbywają się wykłady, prezentacje firm, ale także wycieczki i
				imprezy integracyjne. ZOSIA tradycyjnie odbywa się na przełomie lutego i marca, dzieląc
				pasję do technologii w unikalnej, zimowej atmosferze.
			</p>
		</section>

		<hr />

		<section class="space-y-6">
			<div class="flex items-center gap-4">
				<h2 class="my-0!">Archiwum poprzednich edycji</h2>
				<div class="h-px flex-1 bg-base-content/10"></div>
				<FolderOpen class="size-5 text-base-content/20" />
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
					{@render zosiaEdition(edition)}
				{/each}
			</div>
		</section>
	</div>
</Wrapper>
