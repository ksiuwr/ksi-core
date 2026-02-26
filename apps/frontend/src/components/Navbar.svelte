<script lang="ts">
	import { getLocale, setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import ThemeButton from './ThemeButton.svelte';
	import { PanelLeft } from '@lucide/svelte';
	import { sidebarStore } from '$lib/sidebar';
</script>

<header
	class="sticky top-0 z-40 flex h-[60px] w-full flex-row items-center justify-between border-b border-b-base-200 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/60"
>
	<div class="flex h-full items-center">
		<button
			onclick={() => {
				$sidebarStore = !$sidebarStore;
			}}
			class="btn btn-square btn-ghost h-[60px] w-[60px] rounded-none border-r border-base-200 lg:hidden"
			aria-label="Toggle sidebar"
		>
			<PanelLeft class="size-5" />
		</button>

		<a
			href="/"
			class="flex h-full w-[140px] items-center gap-4 px-6 font-mono text-lg opacity-80 transition-colors hover:bg-base-200/50 md:text-2xl lg:border-r lg:border-base-200 lg:w-[250px]"
		>
			<img src="/logo.svg" alt="" class="size-8 dark:invert md:size-10" />
			KSI
		</a>
	</div>

	<div class="flex h-full">
		<button
			onclick={() => {
				const current = getLocale();
				setLocale(current === 'pl' ? 'en' : 'pl');
			}}
			class="btn btn-square btn-outline h-[60px] w-[60px] rounded-none border-y-0 border-r-0"
		>
			{m.EMOJI()}
		</button>
		<ThemeButton />
	</div>
</header>
