<script lang="ts">
	import { File } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		name,
		icon,
		textClassName,
		containerClassName,
		children
	}: {
		name: string;
		icon?: Snippet;
		textClassName?: ClassValue;
		containerClassName?: ClassValue;
		children: Snippet;
	} = $props();
</script>

<section
	class={['border border-base-200 flex flex-col px-4 md:px-10 lg:px-20 py-4', containerClassName]}
>
	<code class={['opacity-60 flex gap-2 items-center', textClassName]}>
		{#if icon}
			{@render icon()}
		{:else}
			<File class="size-4" />
		{/if}
		{name}
	</code>
	<div class="w-screen h-px bg-base-200 relative left-1/2 -translate-x-1/2 my-4"></div>
	{@render children()}
</section>
