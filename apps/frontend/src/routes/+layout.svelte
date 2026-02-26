<script lang="ts">
	import '../app.css';
	import Navbar from '../components/Navbar.svelte';
	import Sidebar from '../components/Sidebar.svelte';
	import Footer from '../components/Footer.svelte';
	import { Toaster } from 'svelte-sonner';
	import { themeStore } from '$lib/themeStore';
	import Alert from '../components/Alert.svelte';

	const { children, data } = $props();
</script>

<svelte:head>
	<title>KSI UWr</title>
</svelte:head>

<Toaster theme={$themeStore} richColors />

<div class="mx-auto flex min-h-screen flex-col md:gap-4 xl:py-8 xl:max-w-[1440px]">
	{#if data.alert}
		<div class="w-full">
			<Alert alert={data.alert} />
		</div>
	{/if}

	<div class="flex flex-1 flex-col bg-base-100 xl:border xl:border-base-200">
		<Navbar />

		<div class="relative flex flex-1 items-start">
			<Sidebar />

			<main class="flex-1 min-w-0 w-full px-4 sm:px-6 lg:px-12 py-8 md:py-12">
				{@render children?.()}
			</main>
		</div>

		<div class="relative z-10 bg-base-100">
			<Footer />
		</div>
	</div>
</div>
