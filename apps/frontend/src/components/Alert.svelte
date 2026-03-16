<script lang="ts">
	import type { api } from '$lib/backend';
	import { SquareArrowOutUpRight, Terminal } from '@lucide/svelte'; // Opcjonalnie: ikona terminala
	import { cva } from 'class-variance-authority';

	import { cn } from '$lib/utils';

	let {
		alert,
		class: className
	}: {
		alert: NonNullable<Awaited<ReturnType<typeof api.alerts.current.get>>['data']>;
		class?: string;
	} = $props();

	const alertVariants = cva(
		'relative flex w-full flex-col gap-2 border-y md:border p-4 font-mono text-sm transition-all duration-200 md:rounded-sm',
		{
			variants: {
				color: {
					neutral:
						'border-base-content/20 bg-base-300/10 text-base-content/80 hover:bg-base-300/20',
					warning: 'border-warning/50 bg-warning/5 text-warning hover:bg-warning/10',
					danger: 'border-error bg-error/5 text-error hover:bg-error/10',
					info: 'border-info/50 bg-info/5 text-info hover:bg-info/10'
				},
				isLink: {
					true: 'cursor-pointer group',
					false: ''
				}
			},
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
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2 font-bold uppercase tracking-wider">
							{#if alertColor === 'danger'}
								<span>[ERROR]</span>
							{:else if alertColor === 'warning'}
								<span>[WARN]</span>
							{:else}
								<span>&gt;</span>
							{/if}
							<span>{alert.title}</span>
						</div>
						<p class="opacity-90 leading-relaxed wrap-anywhere">
							{alert.description}
						</p>
					</div>

					<SquareArrowOutUpRight
						class="size-4 opacity-50 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-100"
					/>
				</div>
			</a>
		{:else}
			<div class={cn(alertVariants({ color: alertColor, isLink: false }))}>
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-2 font-bold uppercase tracking-wider">
						{#if alertColor === 'danger'}
							<span>[ERROR]</span>
						{:else if alertColor === 'warning'}
							<span>[WARN]</span>
						{:else}
							<span>&gt;</span>
						{/if}
						<span>{alert.title}</span>
					</div>
					<p class="opacity-90 leading-relaxed">{alert.description}</p>
				</div>
			</div>
		{/if}
	{/if}
</div>
