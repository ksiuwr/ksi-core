<script>
	import { m } from '$lib/paraglide/messages';
	import { Github } from '@lucide/svelte';
</script>

<footer class="mt-auto w-full border-t border-base-content/10 bg-base-100 py-10 text-sm">
	<div class="mx-auto flex max-w-3xl flex-col gap-8 px-6 md:flex-row md:justify-between md:gap-4">
		<div class="flex flex-col gap-1">
			<strong class="font-medium text-base-content">
				{m.seemly_flaky_myna_buy()}
			</strong>
			<address class="not-italic text-base-content/60">
				{@html m.major_swift_angelfish_borrow()}
			</address>
		</div>

		<div class="flex flex-col gap-1 md:text-right md:items-end">
			<p class="font-mono font-medium text-primary transition-colors">ksi [at] cs.uni.wroc.pl</p>
			<span class="text-base-content/40">© KSI {new Date().getFullYear()}</span>
			<a
				href="https://github.com/ksiuwr/ksi-core"
				class="gap-2 text-base-content/40 hover:text-primary"
				target="_blank"
			>
				<Github class="inline w-3 h-3 mr-px" />
				{m.loud_calm_horse_hide()}
			</a>
		</div>
	</div>
</footer>
