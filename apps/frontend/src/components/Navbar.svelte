<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import ThemeButton from './ThemeButton.svelte';
	import { PanelLeft } from '@lucide/svelte';
	import { sidebarStore } from '$lib/sidebar';
</script>

<div
	class="fixed left-0 top-0 flex flex-row border-b border-b-base-200 bg-base-100 w-full h-[60px] items-center justify-between z-40"
>
	<div class="flex h-full">
		<button
			onclick={() => {
				$sidebarStore = true;
			}}
			class="btn btn-square btn-outline size-[60px] border-0 rounded-none"
		>
			<PanelLeft class="size-4" />
		</button>
		<a
			href="/"
			class="text-lg md:text-2xl font-mono opacity-80 flex gap-4 border-x border-base-300 w-[140px] px-4 transition-colors hover:bg-base-200/50 h-full items-center"
		>
			<img src="./logo.svg" alt="" class="dark:invert size-10" />
			KSI
		</a>
	</div>
	<div class="flex h-full">
		<button
			onclick={() => {
				setLocale(getLocale() === 'pl' ? 'en' : 'pl');
			}}
			class="btn btn-square btn-outline size-[60px] border-y-0 border-r-0 rounded-none"
		>
			{m.EMOJI()}
		</button>
		<ThemeButton />
	</div>
</div>
