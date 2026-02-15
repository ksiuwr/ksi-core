<script lang="ts">
	import { showAdmin, sidebarStore } from '$lib/sidebar';
	import {
		File,
		FileIcon,
		LogIn,
		LogOut,
		Megaphone,
		PanelLeftClose,
		Star,
		Wrench
	} from '@lucide/svelte';
	import { motion } from 'motion-start';
	import { authClient } from '../lib/auth-client';
	import { api } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import { editions } from '$lib/data/conferences.js';
	import SidebarAccordion from './SidebarAccordion.svelte';

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
</script>

<motion.div
	class="fixed top-0 left-0 select-none h-screen flex flex-col pointer-events-none z-60"
	animate={show
		? {
				x: 0
			}
		: {
				x: '-100%'
			}}
	initial={{
		x: '-100%'
	}}
	transition={{
		bounceDamping: 20,
		damping: 0.2
	}}
>
	<div class="flex size-[60px] border-b border-base-300 pointer-events-auto">
		<button
			onclick={() => {
				$sidebarStore = false;
			}}
			class="btn btn-square btn-outline size-[60px] border-0 rounded-none"
		>
			<PanelLeftClose class="size-4" />
		</button>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="bg-base-100 border-r border-base-200 flex flex-col w-[200px] pointer-events-auto h-full z-60"
	>
		<div
			onclick={() => {
				clicks++;
			}}
			class="flex flex-col flex-1 w-full py-2 [&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:font-mono [&_a]:w-full [&_a]:py-px [&_a]:px-4 [&_a]:hover:bg-base-200 opacity-70"
		>
			<a href="/"><File class="size-4" /> README.md</a>
			{#snippet star()}
				<Star class="size-4" />
			{/snippet}
			<SidebarAccordion icon={star} title="zosia">
				<a href="/zosia">
					<FileIcon class="size-4" />
					README.md
				</a>
				{#each Object.keys(editions).sort((a, b) => parseInt(b) - parseInt(a)) as edition}
					<a href={`/zosia/${edition}`}> {edition}.md</a>
				{/each}
			</SidebarAccordion>
			{#if $showAdmin}
				<button
					onclick={() => {
						authClient.signIn.social({
							provider: 'discord',
							callbackURL: 'http://localhost:5173/dashboard'
						});
					}}
					class="text-error font-bold flex items-center gap-2 font-mono w-full py-px px-4 hover:bg-base-200 cursor-pointer"
					><LogIn class="size-4" /> Logowanie</button
				>
			{/if}
			{#if $session.data?.session !== undefined}
				<div class="w-full px-4 py-2 my-2 border-y border-y-base-300">
					<p>Zalogowano jako</p>
					<div class="flex items-center w-full justify-between">
						<p class="text-lg text-primary font-bold">{$session.data?.user.name}</p>
						<button
							type="button"
							onclick={() => {
								authClient.signOut();
							}}
							class="btn btn-outline size-6 rounded-none p-0 btn-xs btn-error"
						>
							<LogOut class="size-3" />
						</button>
					</div>
				</div>
				{#snippet wrench()}
					<Wrench class="size-4" />
				{/snippet}
				<SidebarAccordion icon={wrench} title="dashboard">
					<a href="/dashboard">
						<Wrench class="size-4" />
						HOME.md
					</a>
					<a href="/dashboard/alerts" class="text-primary font-bold"
						><Megaphone class="size-4" /> ALERTS.md</a
					>
				</SidebarAccordion>
			{/if}
		</div>
	</div>
</motion.div>
