<script lang="ts">
	import type { api } from '$lib/backend';
	import { SquareArrowOutUpRight } from '@lucide/svelte';
	import { cva, type VariantProps } from 'class-variance-authority';

	import { cn } from '$lib/utils';

	let {
		alert,
		class: className
	}: {
		alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;
		class?: string;
	} = $props();

	const alertVariants = cva(
		'relative flex w-full flex-col md:items-center justify-center overflow-hidden gap-4 md:gap-2 py-2 px-4 md:px-2 transition-colors duration-300 before:absolute before:left-1/2 before:size-80 before:-translate-x-1/2 before:rounded-full before:blur-2xl before:pointer-events-none',
		{
			variants: {
				color: {
					neutral: 'bg-base-200/5 text-base-content before:bg-base-300/30',
					warning: 'bg-warning/5 text-warning-content before:bg-warning/10',
					danger: 'bg-error/5 text-error-content before:bg-error/10',
					info: 'bg-info/5 text-info-content before:bg-info/10'
				},
				isLink: {
					true: 'cursor-pointer',
					false: ''
				}
			},
			compoundVariants: [
				{
					color: 'info',
					isLink: true,
					class: 'hover:bg-info/10'
				},
				{
					color: 'warning',
					isLink: true,
					class: 'hover:bg-warning/10'
				},
				{
					color: 'danger',
					isLink: true,
					class: 'hover:bg-error/10'
				}
			],
			defaultVariants: {
				color: 'neutral',
				isLink: false
			}
		}
	);

	const alertColor = $derived(alert?.color ?? 'neutral');
</script>

<div class={className}>
	{#if alert !== null}
		{#if alert.link && alert.link !== ''}
			<a
				href={alert.link}
				target="_blank"
				class={cn(alertVariants({ color: alertColor, isLink: true }))}
			>
				<div class="flex items-center gap-px">
					<b class="font-lora text-lg">{alert.title}</b>
					<SquareArrowOutUpRight class="ml-4 size-4" />
				</div>
				<p class="opacity-80 text-sm md:text-base sm:tracking-tighter">{alert.description}</p>
			</a>
		{:else}
			<div class={cn(alertVariants({ color: alertColor, isLink: false }))}>
				<b class="font-lora text-lg">{alert.title}</b>
				<p class="opacity-80 text-sm md:text-base sm:tracking-tighter">{alert.description}</p>
			</div>
		{/if}
	{/if}
</div>
