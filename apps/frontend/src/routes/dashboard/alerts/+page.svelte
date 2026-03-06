<script lang="ts">
	import { Megaphone, Plus, Trash, X, Pencil } from '@lucide/svelte';
	import Wrapper from '../../../components/Wrapper.svelte';
	import { api, resolveError } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import ms from 'ms';
	import { motion } from 'motion-start';
	import { m } from '$lib/paraglide/messages';

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
	let editingId = $state<string | null>(null);
	let newAlert = $state({
		title: '',
		description: '',
		color: 'neutral' as 'neutral' | 'info' | 'warning' | 'danger',
		startDate: new Date(),
		endDate: new Date(new Date().getTime() + ms('7d')),
		priority: 0,
		link: ''
	});

	async function fetchAlerts() {
		const r = await api.dashboard.admin.alerts.get({
			query: {
				page: currentPage
			}
		});
		if (r.error) {
			toast.error(resolveError(r.error));
			return;
		}
		alerts = r.data.results;
		maxPage = r.data.pages;
	}

	$effect(() => {
		fetchAlerts();
	});

	function resetForm() {
		creating = false;
		editingId = null;
		newAlert = {
			title: '',
			description: '',
			color: 'neutral',
			startDate: new Date(),
			endDate: new Date(new Date().getTime() + ms('7d')),
			priority: 0,
			link: ''
		};
	}

	function startEditing(alert: (typeof alerts)[0]) {
		newAlert = {
			title: alert.title,
			description: alert.description,
			color: alert.color,
			startDate: new Date(alert.startDate),
			endDate: new Date(alert.endDate),
			priority: alert.priority || 0,
			link: alert.link || ''
		};
		editingId = alert.id;
		creating = true;
	}

	async function saveAlert() {
		if (editingId) {
			const r = await api.dashboard.admin.alerts({ id: editingId }).put({
				...newAlert,
				priority: newAlert.priority || undefined,
				link: newAlert.link
			});
			if (r.error) {
				toast.error(resolveError(r.error));
				return;
			}
			toast.success('Alert updated successfully');
		} else {
			const r = await api.dashboard.admin.alerts.post({
				...newAlert,
				priority: newAlert.priority || undefined,
				link: newAlert.link || undefined
			});
			if (r.error) {
				toast.error(resolveError(r.error));
				return;
			}
			toast.success('Alert created successfully');
		}

		resetForm();
		fetchAlerts();
	}

	async function deleteAlert(id: string) {
		const r = await api.dashboard.admin.alerts({ id }).delete();
		if (r.error) {
			toast.error(resolveError(r.error));
			return;
		}
		toast.success('Alert deleted');
		fetchAlerts();
	}

	function formatDateForInput(date: Date) {
		const localISOTime = new Date(date.getTime()).toISOString().slice(0, 16);
		return localISOTime;
	}
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

<Wrapper name="dashboard/ALERTS" {icon}>
	<h2>{m.short_house_penguin_amuse()}</h2>
	{m.smart_smug_parrot_surge()}
</Wrapper>
<div class="flex flex-col my-8 gap-4">
	{#if !creating}
		<motion.button
			layoutId="new"
			onclick={() => (creating = true)}
			class="btn btn-outline btn-lg rounded-none w-fit self-center"
		>
			<Plus class="size-4" />
			{m.real_next_frog_dare()}
		</motion.button>
	{:else}
		<div class="p-6 border border-base-200 flex flex-col gap-6 bg-base-100 shadow-sm">
			<div class="flex justify-between items-center border-b border-base-200 pb-4">
				<h2 class="text-2xl font-bold">
					{editingId ? m.frail_blue_impala_savor() : m.many_bald_seal_pat()}
				</h2>
				<button class="btn btn-ghost btn-sm btn-circle" onclick={resetForm}>
					<X class="size-5" />
				</button>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.basic_icy_turtle_thrive()}</span>
					</div>
					<input
						type="text"
						placeholder={m.wise_proof_snail_hug()}
						class="input input-bordered w-full"
						bind:value={newAlert.title}
					/>
				</div>

				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.front_wacky_capybara_snip()}</span>
					</div>
					<select class="select select-bordered w-full" bind:value={newAlert.color}>
						<option value="neutral">{m.legal_dizzy_parakeet_sail()}</option>
						<option value="info">{m.happy_watery_warbler_grin()}</option>
						<option value="warning">{m.candid_teary_goose_persist()}</option>
						<option value="danger">{m.maroon_white_lion_commend()}</option>
					</select>
				</div>

				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.knotty_caring_rabbit_burn()}</span>
					</div>
					<input
						type="datetime-local"
						class="input input-bordered w-full"
						value={formatDateForInput(newAlert.startDate)}
						oninput={(e) => (newAlert.startDate = new Date(e.currentTarget.value))}
					/>
				</div>

				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.away_only_piranha_honor()}</span>
					</div>
					<input
						type="datetime-local"
						class="input input-bordered w-full"
						value={formatDateForInput(newAlert.endDate)}
						oninput={(e) => (newAlert.endDate = new Date(e.currentTarget.value))}
					/>
				</div>

				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.smug_glad_turtle_agree()}</span>
						<span class="label-text-alt text-base-content/60">{m.north_clear_bobcat_blend()}</span>
					</div>
					<input
						type="number"
						placeholder="0"
						class="input input-bordered w-full"
						bind:value={newAlert.priority}
					/>
				</div>

				<div class="form-control w-full">
					<div class="label">
						<span class="label-text font-medium">{m.aware_every_ladybug_strive()}</span>
						<span class="label-text-alt text-base-content/60">{m.north_clear_bobcat_blend()}</span>
					</div>
					<input
						type="text"
						placeholder="https://example.com"
						class="input input-bordered w-full"
						bind:value={newAlert.link}
					/>
				</div>

				<div class="form-control w-full md:col-span-2">
					<div class="label">
						<span class="label-text font-medium">{m.quiet_cozy_pug_zap()}</span>
					</div>
					<textarea
						class="textarea textarea-bordered h-32 text-base leading-relaxed"
						placeholder={m.cool_caring_pony_drop()}
						bind:value={newAlert.description}
					></textarea>
				</div>
			</div>

			<div class="flex justify-end gap-2 pt-4 border-t border-base-200">
				<button class="btn btn-ghost" onclick={resetForm}>{m.sour_spare_mantis_buy()}</button>
				<button class="btn btn-primary px-8" onclick={saveAlert}>
					{editingId ? m.curly_home_racoon_grin() : m.civil_left_samuel_love()}
				</button>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-3">
		{#each alerts as alert}
			<div class="card bg-base-100 border border-base-200">
				<div class="card-body p-5">
					<div class="flex justify-between items-start gap-4">
						<div class="flex-1">
							<h3 class="card-title text-lg flex items-center gap-2 mb-1">
								{alert.title}
								<div
									class={`badge badge-${alert.color === 'danger' ? 'error' : alert.color} badge-sm`}
								>
									{alert.color}
								</div>
							</h3>
							<p class="text-xs text-base-content/60 mb-3 font-mono">
								{new Date(alert.startDate).toLocaleString()} — {new Date(
									alert.endDate
								).toLocaleString()}
							</p>
							<p class="text-base-content/80 whitespace-pre-wrap break-all">{alert.description}</p>
							{#if alert.link}
								<a
									href={alert.link}
									target="_blank"
									class="link link-primary text-sm mt-2 inline-block">{alert.link.slice(0, 50)}</a
								>
							{/if}
						</div>
						<div class="flex gap-1">
							<button
								class="btn btn-square btn-ghost btn-sm text-base-content/70 hover:text-primary"
								onclick={() => startEditing(alert)}
								aria-label="Edytuj"
							>
								<Pencil class="size-4" />
							</button>
							<button
								class="btn btn-square btn-ghost btn-sm text-base-content/70 hover:text-error"
								onclick={() => deleteAlert(alert.id)}
								aria-label="Usuń"
							>
								<Trash class="size-4" />
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if maxPage > 1}
		<div class="flex gap-2 self-center mt-4">
			{#each pages as page}
				{@render pageButton(page)}
			{/each}
		</div>
	{/if}
</div>
