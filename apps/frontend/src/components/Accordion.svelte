<script lang="ts">
	import { accordionStore } from '$lib/accordion';
	import { motion } from 'motion-start';
	import type { Snippet } from 'svelte';

	const {
		title,
		children
	}: {
		title: string;
		children: Snippet;
	} = $props();

	let id = title.slice(0, 4).toLowerCase();

	let show = $derived($accordionStore === id);
</script>

<button
	role="switch"
	class={[
		'flex flex-col gap-2 cursor-pointer hover:bg-primary/10 transition-colors border border-base-300 w-full p-4 rounded-box',
		show && 'bg-primary/10'
	]}
	aria-checked={show}
	onclick={() => {
		if (show) {
			$accordionStore = '';
		} else {
			$accordionStore = id;
		}
	}}
>
	<div class={'flex justify-between items-center transition-colors'}>
		<h1 class="text-[clamp(2rem,2cqw,4rem)] font-lora">{title}</h1>
	</div>
	<motion.div
		animate={show ? { height: 'auto' } : { height: 0 }}
		initial={{
			height: 0
		}}
		class="overflow-hidden"
	>
		<div class="w-full h-px bg-base-content/20 my-4"></div>
		{@render children()}
	</motion.div>
</button>
