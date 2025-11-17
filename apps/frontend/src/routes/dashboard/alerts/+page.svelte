<script lang="ts">
	import { Megaphone, Plus } from '@lucide/svelte';
	import Wrapper from '../../../components/Wrapper.svelte';
	import { api, resolveError } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import ms from 'ms';

	let alerts = $state<
		NonNullable<Awaited<ReturnType<typeof api.dashboard.admin.alerts.get>>['data']>['results']
	>([]);
	let maxPage = $state(0);
	let currentPage = $state(0);

	let pages = $derived([
		0,
		...[currentPage - 1, currentPage, currentPage + 1].filter((p) => p > 1 && p < maxPage),
		...[maxPage].filter((p) => p !== 0)
	]);

	let creating = $state(false);
	let newAlert = $state({
		title: '',
		description: '',
		color: 'neutral',
		startDate: new Date(),
		endDate: new Date(new Date().getTime() + ms('7d'))
	});

	$effect(() => {
		api.dashboard.admin.alerts
			.get({
				query: {
					page: currentPage
				}
			})
			.then((r) => {
				if (r.error) {
					toast.error(resolveError(r.error));
					return;
				}
				alerts = r.data.results;
				maxPage = r.data.pages;
			});
	});
</script>

{#snippet icon()}
	<Megaphone class="size-4" />
{/snippet}

{#snippet pageButton(page: number)}
	<button
		class="btn btn-square btn-sm btn-outline"
		disabled={currentPage === page}
		onclick={() => (currentPage = page)}>{page + 1}</button
	>
{/snippet}

<Wrapper containerClassName="markdown-file" name="dashboard/ALERTS.md" {icon}>
	<h2>Alerty</h2>
	Zarządzaj alertem wyświetlanym na górze strony.
</Wrapper>
<div class="flex flex-col my-8 gap-4">
	<button class="btn btn-outline btn-lg rounded-none w-fit self-center">
		<Plus class="size-4" /> utwórz nowy
	</button>
	{#each alerts as alert}
		<div class="flex flex-col p-2 border border-base-200"></div>
	{/each}
	<div class="flex gap-2 self-center">
		{#each pages as page}
			{@render pageButton(page)}
		{/each}
	</div>
</div>
