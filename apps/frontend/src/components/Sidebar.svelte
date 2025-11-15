<script lang="ts">
	import { showAdmin, sidebarStore } from '$lib/sidebar';
	import { File, LogIn, LogOut, PanelLeftClose, Star, Wrench } from '@lucide/svelte';
	import { motion } from 'motion-start';
	import { authClient } from '../lib/auth-client';
	import { api } from '$lib/backend';
	import { toast } from 'svelte-sonner';

	let show = $derived($sidebarStore);

	let clicks = $state(0);
	$effect(() => {
		if (clicks >= 4 && $session.data?.user === null) $showAdmin = true;
		setTimeout(() => (clicks = 0), 5000);
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
	class="fixed top-0 left-0 select-none h-screen flex flex-col z-60"
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
	<div class="flex size-[60px] border-b border-base-300">
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
	<div class="bg-base-100 border-r border-base-200 flex flex-col w-[200px] h-full z-60">
		<div
			onclick={() => {
				clicks++;
			}}
			class="flex flex-col flex-1 w-full py-2 [&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:font-mono [&_a]:w-full [&_a]:py-px [&_a]:px-4 [&_a]:hover:bg-base-200 opacity-70"
		>
			<a href="/"><File class="size-4" /> README.md</a>
			<a href="/zosia" class="text-primary font-bold"><Star class="size-4" /> ZOSIA.md</a>
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
				<a href="/dashboard"><Wrench class="size-4" /> DASHBOARD.md</a>
			{/if}
		</div>
	</div>
</motion.div>
