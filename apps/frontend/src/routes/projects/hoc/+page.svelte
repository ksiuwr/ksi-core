<script>
	import Wrapper from '../../../components/Wrapper.svelte';
	import Goal from '../../../components/Goal.svelte';
	import { m } from '$lib/paraglide/messages';
	import DynamicGallery from '../../../components/DynamicGallery.svelte';
</script>

<Wrapper name="projects/hoc.md">
	<div class="flex flex-col gap-8 py-8 pl-px md:pl-8 text-base-content">
		<h1>Hour of Code</h1>

		<p>
			{m.brave_fancy_owl_spin()}
		</p>
		<div class="flex flex-col lg:flex-row gap-4">
			<div class="p-4 border border-secondary/20 bg-secondary/10">
				<h2 class="font-bold text-secondary">{m.happy_dizzy_goat_fly()}</h2>
				<p>
					{@html m.dizzy_clever_dog_climb()}
				</p>
			</div>
			<div class="p-4 border border-primary/20 bg-primary/10">
				<h2 class="font-bold text-primary">{m.glad_antsy_mouse_swim()}</h2>
				<p>
					{m.eager_loud_owl_crawl()}
				</p>
			</div>
		</div>

		<section class="space-y-6 w-full">
			<h2>{m.loud_loud_frog_roll()}</h2>
			<p>
				{m.calm_glad_tadpole_dive()}
			</p>
			<p>
				{m.calm_brave_horse_walk()}
			</p>
		</section>
		<section class="space-y-6 w-full">
			<h2>{m.cool_wild_tadpole_hide()}</h2>
			<p>
				{m.calm_loud_owl_fly()}
			</p>
		</section>

		<section class="space-y-6 w-full">
			<h2>{m.jolly_happy_iguana_jump()}</h2>
			<p>
				{@html m.clever_away_lion_roll()}
			</p>
		</section>
		<section class="space-y-6 w-full">
			<h2>{m.shy_jolly_iguana_walk()}</h2>
			<p>{m.shy_calm_horse_swim()}</p>

			<DynamicGallery id="project-hoc-current" />
		</section>

		<section class="space-y-6 w-full">
			<h2>{m.shy_dizzy_tiger_fold()}</h2>
			<p>
				{m.cool_loud_apple_crawl()}
			</p>

			<DynamicGallery id="project-hoc-past" />
		</section>

		<section class="space-y-6 w-full">
			<h2>{m.clean_plane_finch_spin()}</h2>

			<div class="flex flex-col gap-4 w-full">
				<Goal type="social">{m.cool_cool_mouse_climb()}</Goal>
			</div>
		</section>

		<section class="space-y-4">
			<h2>{m.last_lucky_reindeer_belong()}</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-sm w-full">
				{#each ['Agata Raczyk', 'Bartosz Kebel', 'Bartosz Kruszewski', 'Emilia Wiśniewska', 'Hania Laszkiewicz', 'Helena Rafałowicz', 'Kiri Goroshenko', 'Lidia Podoluk', 'Maksymilian Kochan', 'Michał Szwejda', 'Piotr Wdowiak', 'Wojciech Romanowski'] as member, i (i)}
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
