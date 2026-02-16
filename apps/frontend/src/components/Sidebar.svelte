<script lang="ts">
	import { showAdmin, sidebarStore } from '$lib/sidebar';
	import { File, FileIcon, LogIn, LogOut, Megaphone, PanelLeftClose, Wrench } from '@lucide/svelte';
	import { motion } from 'motion-start';
	import { authClient } from '../lib/auth-client';
	import { api } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import { editions } from '$lib/data/conferences.js';
	import SidebarAccordion from './SidebarAccordion.svelte';
	import { page } from '$app/stores';
	import SidebarLink from './SidebarLink.svelte';

	let show = $derived($sidebarStore);
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
					toast.error('Brak dostępu.', {
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
			Dokumentacja
		</div>

		<SidebarLink href="/" icon={File}>README.md</SidebarLink>

		<SidebarAccordion title="zosia">
			<SidebarLink href="/zosia" icon={FileIcon}>README.md</SidebarLink>
			{#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
				<SidebarLink href={`/zosia/${edition}`}>{edition}.md</SidebarLink>
			{/each}
		</SidebarAccordion>

		<SidebarAccordion title="projects">
			<SidebarLink href="/projects/physarum" icon={FileIcon} exact={false}>physarum.md</SidebarLink>
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
							callbackURL: 'http://localhost:5173/dashboard'
						});
					}}
					class="text-error font-bold flex items-center gap-3 font-mono text-sm w-full py-1.5 px-6 hover:bg-base-200 cursor-pointer text-left"
				>
					<LogIn class="size-4" /> Logowanie
				</button>
			{/if}

			{#if $session.data?.session !== undefined}
				<div class="pt-4">
					<div class="w-full px-4 py-2 my-2 border-t border-base-200 bg-base-200/30">
						<div class="flex items-center w-full justify-between px-2">
							<div class="flex flex-col">
								<span class="text-xs opacity-50">Zalogowano jako</span>
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
								title="Wyloguj"
							>
								<LogOut class="size-4" />
							</button>
						</div>
					</div>

					<SidebarAccordion title="dashboard">
						<SidebarLink href="/dashboard" icon={Wrench}>HOME.md</SidebarLink>
						<SidebarLink href="/dashboard/alerts" icon={Megaphone}>ALERTS.md</SidebarLink>
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

<motion.div
	class="fixed top-0 left-0 h-screen flex flex-col z-50 lg:hidden shadow-2xl"
	animate={show ? { x: 0 } : { x: '-100%' }}
	initial={{ x: '-100%' }}
	transition={{ bounceDamping: 20, damping: 0.2 }}
>
	<div class="flex h-[60px] items-center border-b border-base-200 bg-base-100">
		<button
			onclick={() => {
				$sidebarStore = false;
			}}
			class="btn btn-square btn-ghost h-[60px] w-[60px] rounded-none border-r border-base-200"
		>
			<PanelLeftClose class="size-5" />
		</button>
		<span class="ml-4 font-mono text-lg font-bold">Nawigacja</span>
	</div>

	<div class="bg-base-100 flex flex-col w-[280px] h-full overflow-hidden border-r border-base-200">
		{@render sidebarContent()}
	</div>
</motion.div>

{#if show}
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
		onclick={() => ($sidebarStore = false)}
		transition:motion
	></div>
{/if}
