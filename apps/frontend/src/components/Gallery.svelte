<script lang="ts">
	import { motion } from 'motion-start';

	let { images }: { images: string[] } = $props();
	let splittedImages = $derived([
		images.slice(0, Math.floor(images.length / 3)),
		images.slice(Math.floor(images.length / 3), Math.floor((images.length / 3) * 2)),
		images.slice(Math.floor((images.length / 3) * 2), images.length)
	]);

	let currImage = $state<number | null>(null);

	window.addEventListener('keydown', (e) => {
		if (currImage === null) return;
		if (e.key === 'Escape') {
			currImage = null;
		}
		currImage = currImage as number;
		if (e.key === 'ArrowRight') {
			if (currImage < images.length - 1) currImage++;
		} else if (e.key === 'ArrowLeft') {
			if (currImage > 0) currImage--;
		}
	});
</script>

<motion.div
	animate={currImage === null
		? {
				display: 'none',
				opacity: 0,
				scale: 0
			}
		: {
				opacity: 1,
				scale: 1,
				display: 'block'
			}}
	initial={{
		display: 'none',
		scale: 0
	}}
	class="fixed top-0 left-0 flex flex-col items-center justify-center w-screen h-screen bg-base-100/90 z-90"
>
	<img
		src={images[currImage as number]}
		class="max-w-[50vw] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
		alt=""
	/>
</motion.div>

<div class="grid grid-cols-1 md:grid-cols-3 gap-2">
	{#each splittedImages as splitCol, splitI}
		<div class="flex flex-col gap-2">
			{#each splitCol as image, i}
				<button
					type="button"
					title=""
					onclick={() => {
						let index = 0;
						if (splitI !== 0) {
							for (let j = 0; j < splitI; j++) {
								index += splittedImages[j].length;
							}
						}
						currImage = index + i;
					}}
					class="w-full overflow-hidden transition-all hover:scale-[0.98] hover:opacity-85 hover:rounded-lg cursor-pointer"
				>
					<img src={image} alt="" />
				</button>
			{/each}
		</div>
	{/each}
</div>
