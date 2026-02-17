<script lang="ts">
	import { File, Terminal } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		name,
		icon,
		class: className,
		children
	}: {
		name: string;
		icon?: Snippet;
		class?: string;
		children: Snippet;
	} = $props();
</script>

<section
	class={cn(
		'flex flex-col overflow-hidden rounded-md border border-base-300 bg-base-100',
		className
	)}
>
	<div
		class="flex items-center gap-2 border-b border-base-300 bg-base-200/30 px-4 py-2 text-sm text-base-content/60 md:px-6"
	>
		{#if icon}
			{@render icon()}
		{:else}
			<File class="size-4 opacity-70" />
		{/if}

		<span class="font-mono tracking-tight">{name}</span>
	</div>

	<div class="p-6 md:p-10 lg:p-12">
		{@render children()}
	</div>
</section>
