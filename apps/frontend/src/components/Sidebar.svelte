<script lang="ts">
	import { showAdmin, sidebarStore } from '$lib/sidebar';
	import { File, FileIcon, LogIn, LogOut, Megaphone, PanelLeftClose, Wrench } from '@lucide/svelte';
	import { authClient } from '../lib/auth-client';
	import { api } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import { editions } from '$lib/data/conferences.js';
	import SidebarAccordion from './SidebarAccordion.svelte';
	import { page } from '$app/stores';
	import SidebarLink from './SidebarLink.svelte';
	import { m } from '$lib/paraglide/messages';
	import { getUrls } from 'shared';

	let clicksResetDebounceTimeout: NodeJS.Timeout | null = null;

	let clicks = $state(0);
	$effect(() => {
		if (clicks >= 4 && ($session.data === null || $session.data.user === null)) $showAdmin = true;
		if (clicksResetDebounceTimeout !== null) {
			clearTimeout(clicksResetDebounceTimeout);
		}
		clicksResetDebounceTimeout = setTimeout(() => (clicks = 0), 5000);
	});

	const session = authClient.useSession();

	$effect(() => {
		if (!$session.isPending && $session.data && $session.data?.user !== undefined) {
			api.dashboard.user.get().then(async (r) => {
				if (r.error) {
					await authClient.signOut();
					toast.error(m.civil_solid_gopher_flop(), {
						id: 'access_denied'
					});
					return;
				}
			});
		}
	});

	$effect(() => {
		if ($page.url.pathname) {
			$sidebarStore = false;
		}
	});
</script>

{#snippet sidebarContent()}
	<div class="flex flex-col flex-1 w-full py-4 overflow-y-auto">
		<div
			onclick={() => {
				clicks++;
			}}
			class="px-6 pb-2 text-xs font-bold uppercase tracking-wider text-base-content/40 cursor-default select-none hover:text-base-content/60 transition-colors"
		>
			{m.new_dry_sawfish_drop()}
		</div>

		<SidebarLink href="/" icon={File}>Home</SidebarLink>

		<SidebarAccordion title="zosia">
			<SidebarLink href="/zosia" icon={FileIcon}>README</SidebarLink>
			{#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
				<SidebarLink href={`/zosia/${edition}`}>{edition}</SidebarLink>
			{/each}
		</SidebarAccordion>

		<SidebarAccordion title="projects">
			<SidebarLink href="/projects/physarum" icon={FileIcon} exact={false}>physarum</SidebarLink>
		</SidebarAccordion>

		<div class="flex flex-col w-full">
			{#if $showAdmin}
				<div class="my-4 h-px bg-base-200 mx-6"></div>
				<div class="px-6 pb-2 text-xs font-bold uppercase tracking-wider text-base-content/40">
					Admin
				</div>
				<button
					onclick={() => {
						authClient.signIn.social({
							provider: 'discord',
							callbackURL: getUrls().FRONTEND + '/dashboard'
						});
					}}
					class="text-error font-bold flex items-center gap-3 font-mono text-sm w-full py-1.5 px-6 hover:bg-base-200 cursor-pointer text-left"
				>
					<LogIn class="size-4" />
					{m.basic_equal_emu_jest()}
				</button>
			{/if}

			{#if $session.data?.session !== undefined}
				<div class="pt-4">
					<div class="w-full px-4 py-2 my-2 border-t border-base-200 bg-base-200/30">
						<div class="flex items-center w-full justify-between px-2">
							<div class="flex flex-col">
								<span class="text-xs opacity-50">{m.lazy_seemly_racoon_dash()}</span>
								<span class="text-sm font-bold text-primary truncate max-w-[120px]">
									{$session.data?.user.name}
								</span>
							</div>
							<button
								type="button"
								onclick={() => {
									authClient.signOut();
								}}
								class="btn btn-ghost btn-sm btn-square text-error"
								title={m.still_large_yak_amuse()}
							>
								<LogOut class="size-4" />
							</button>
						</div>
					</div>

					<SidebarAccordion title="dashboard">
						<SidebarLink href="/dashboard" icon={Wrench}>HOME</SidebarLink>
						<SidebarLink href="/dashboard/alerts" icon={Megaphone}>ALERTS</SidebarLink>
					</SidebarAccordion>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

<aside
	class="hidden lg:flex w-[250px] shrink-0 flex-col border-r border-base-200 bg-base-100 sticky top-[60px] h-[calc(100vh-60px)]"
>
	{@render sidebarContent()}
</aside>

<div
	class="fixed top-0 left-0 h-screen flex flex-col z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-out {$sidebarStore
		? 'translate-x-0'
		: 'translate-x-[-100%]'}"
>
	<div class="flex h-[60px] items-center border-b border-r border-base-200 bg-base-100">
		<button
			onclick={() => {
				$sidebarStore = false;
			}}
			class="btn btn-square btn-outline h-[60px] w-[60px] rounded-none border-0 border-r border-base-200"
		>
			<PanelLeftClose class="size-5" />
		</button>
		<span class="ml-4 font-mono text-lg font-bold">{m.inclusive_tough_opossum_bake()}</span>
	</div>

	<div class="bg-base-100 flex flex-col w-[280px] h-full overflow-hidden border-r border-base-200">
		{@render sidebarContent()}
	</div>
</div>

<div
	role="presentation"
	class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ease-out {$sidebarStore ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
	onclick={() => ($sidebarStore = false)}
></div>
