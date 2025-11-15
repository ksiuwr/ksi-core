<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		href,
		title,
		icon,
		classValue,
		children
	}: {
		href: string;
		title: string;
		classValue?: ClassValue;
		icon: Snippet;
		children: Snippet[] | Snippet;
	} = $props();

	let expanded = $state(false);
</script>

<div class="flex flex-col">
	<div class="flex py-1 px-1 items-center gap-px hover:bg-base-200">
		<button
			onclick={() => (expanded = !expanded)}
			class="btn btn-xs rounded-none size-5 p-0 btn-outline btn-square"
		>
			<ChevronDown class={['size-3', expanded && 'rotate-180']} />
		</button>
		<a class={['w-auto! pl-2!', classValue]} {href}>{@render icon()} {title}</a>
	</div>
	{#if expanded}
		<div
			class="flex flex-col [&_a]:pl-4! [&_a]:w-auto! [&_a]:before:size-4 [&_a]:before:border-b [&_a]:before:border-l [&_a]:before:mb-4 [&_a]:before:border-base-300"
		>
			{@render children()}
		</div>
	{/if}
</div>
