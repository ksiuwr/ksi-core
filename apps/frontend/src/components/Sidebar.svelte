<script lang="ts">
	import { sidebarStore } from '$lib/sidebar';
	import { File, PanelLeft, PanelLeftClose, Star } from '@lucide/svelte';
	import { motion } from 'motion-start';

	let show = $derived($sidebarStore);

	let showAdmin = $state(false);
</script>

<motion.div
	class="fixed top-0 left-0 h-screen bg-base-100 border-r border-base-200 flex flex-col min-w-[200px] z-60"
	animate={show
		? {
				x: 0
			}
		: {
				x: '-100%'
			}}
	initial={{
		x: '-100%'
	}}
	transition={{
		bounceDamping: 20,
		damping: 0.2
	}}
>
	<div class="flex h-[60px] w-full border-b border-base-300">
		<button
			onclick={() => {
				$sidebarStore = false;
			}}
			class="btn btn-square btn-outline size-[60px] border-0 rounded-none"
		>
			<PanelLeftClose class="size-4" />
		</button>
		<a
			href="/"
			class="text-lg md:text-2xl font-mono opacity-80 flex gap-4 border-x border-base-300 flex-1 justify-center transition-colors hover:bg-base-200/50 h-full items-center"
		>
			<img src="./logo.svg" alt="" class="dark:invert size-10" />
			KSI
		</a>
	</div>
	<div
		class="flex flex-col w-full py-2 [&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:font-mono [&_a]:w-full [&_a]:py-px [&_a]:px-4 [&_a]:hover:bg-base-200 opacity-70"
	>
		<a href="/"><File class="size-4" /> README.md</a>
		<a href="/zosia" class="text-primary font-bold"><Star class="size-4" /> ZOSIA.md</a>
	</div>
</motion.div>
