<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<div class=" max-w-4xl px-6 space-y-24 py-10 text-base-content">
	<header class="flex flex-col gap-6">
		<h1 class="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
			{m.away_antsy_tadpole_fold()}
			<span class="block text-2xl md:text-3xl font-medium text-base-content/60 mt-2">
				{m.mean_white_carp_fold()}
			</span>
		</h1>
	</header>

	<section class="space-y-6">
		<h2 class="text-4xl font-semibold tracking-tight">{m.weird_odd_husky_bump()}</h2>

		<p class="text-lg leading-relaxed text-base-content/80">
			{m.aloof_plane_octopus_aspire()}
		</p>

		<p class="text-lg leading-relaxed text-base-content/80">
			{@html m.inner_grand_sloth_aid()}
		</p>
	</section>

	<section class="space-y-6">
		<h2 class="text-4xl font-semibold tracking-tight">{m.jolly_dizzy_dog_swim()}</h2>

		<p class="text-lg leading-relaxed text-base-content/80">{m.fancy_wild_owl_climb()}</p>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
			<a
				href="/projects/hoc"
				class="border border-base-content/20 py-4 px-8 transition-colors hover:border-primary hover:bg-primary/20"
			>
				<h2 class="font-bold">{m.antsy_clever_eagle_fly()}</h2>

				<p class="text-lg leading-relaxed text-base-content/80">
					{m.calm_cool_owl_crawl()}
				</p>
			</a>
			<a
				href="/projects/krasnal"
				class="border border-base-content/20 py-4 px-8 transition-colors hover:border-primary hover:bg-primary/20"
			>
				<h2 class="font-bold">{m.cool_shy_tiger_fold()}</h2>

				<p class="text-lg leading-relaxed text-base-content/80">
					{m.wild_clever_lion_dive()}
				</p>
			</a>
		</div>
	</section>
</div>
