<script lang="ts">
	import type { Snippet } from 'svelte';
	import { FlaskConical, CodeXml, Share2 } from '@lucide/svelte';

	let {
		type,
		children
	}: {
		type: 'scientific' | 'technical' | 'social';
		children: Snippet;
	} = $props();

	// Mapowanie konfiguracji na podstawie typu
	const config = {
		scientific: {
			colorClass: 'border-accent bg-accent/5 text-accent',
			label: '// Naukowo',
			icon: FlaskConical
		},
		technical: {
			colorClass: 'border-secondary bg-secondary/5 text-secondary',
			label: '// Technicznie',
			icon: CodeXml
		},
		social: {
			colorClass: 'border-primary bg-primary/5 text-primary',
			label: '// Społecznie',
			icon: Share2
		}
	};

	const current = $derived(config[type]);
</script>

<div class={`flex gap-4 p-4 border-l-2 rounded-r-md w-full ${current.colorClass}`}>
	<div class="shrink-0 mt-1">
		<svelte:component this={current.icon} class="size-5" />
	</div>
	<div class="flex flex-col w-full">
		<span class="font-mono text-xs font-bold uppercase tracking-wider mb-1 opacity-90">
			{current.label}
		</span>
		<div class="text-base-content/90 leading-relaxed">
			{@render children()}
		</div>
	</div>
</div>
