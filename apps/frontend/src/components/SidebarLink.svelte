<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import type { Component } from 'svelte';

	let {
		href,
		icon: Icon,
		children,
		exact = true
	}: {
		href: string;
		icon?: Component<any>;
		children?: any;
		exact?: boolean;
	} = $props();

	const isActive = $derived(
		exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href)
	);
</script>

<a
	{href}
	class={cn(
		'flex items-center gap-3 font-mono text-sm w-full py-1.5 px-6 transition-all duration-150',
		'text-base-content/70 hover:bg-base-200',
		isActive && 'bg-secondary text-secondary-content hover:bg-secondary/80 font-bold shadow-sm'
	)}
>
	{#if Icon}
		<Icon class="size-4" />
	{/if}
	<span>
		{@render children?.()}
	</span>
</a>
