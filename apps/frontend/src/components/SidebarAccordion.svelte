<script lang="ts">
	import { ChevronRight, Folder } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: string;
		children: Snippet;
	} = $props();

	let expanded = $state(false);
</script>

<div class="flex flex-col">
	<div class="flex py-1 px-1 items-center gap-px hover:bg-base-200">
		<button
			onclick={() => (expanded = !expanded)}
			class="flex w-full items-center cursor-pointer gap-2 font-mono hover:bg-base-200 justify-start rounded-none px-2"
		>
			<ChevronRight class={['size-4', expanded && 'rotate-90']} />
			<Folder class="size-4" />
			{title}
		</button>
	</div>
	{#if expanded}
		<div
			class="flex flex-col [&_a]:pl-10! [&_a]:w-auto! [&_a]:before:left-5 [&_a]:before:absolute [&_a]:before:w-4 [&_a]:before:h-[26px] [&_a]:before:border-b [&_a]:before:border-l [&_a]:before:mb-4 [&_a]:before:border-base-content/30"
		>
			{@render children()}
		</div>
	{/if}
</div>
