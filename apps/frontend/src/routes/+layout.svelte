<script lang="ts">
	import { motion } from 'motion-start';
	import '../app.css';
	import Navbar from '../components/Navbar.svelte';
	import Sidebar from '../components/Sidebar.svelte';
	import { sidebarStore } from '$lib/sidebar';
	import Footer from '../components/Footer.svelte';
	import { toast, Toaster } from 'svelte-sonner';
	import { themeStore } from '$lib/themeStore';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	const { children } = $props();
	let sidebarShown = $derived($sidebarStore);

	let innerWidth = $state(browser ? window.innerWidth : 1024);
	let prefersReducedMotion = $state(false);

	onMount(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = mediaQuery.matches;

		mediaQuery.addEventListener('change', (e) => {
			prefersReducedMotion = e.matches;
		});
	});

	const breakpoint = 768;
	let isSmallScreen = $derived(innerWidth < breakpoint);

	let motionDisabled = $derived(isSmallScreen || prefersReducedMotion);
</script>

<svelte:head>
	<title>KSI UWr</title>
</svelte:head>

<Toaster theme={$themeStore} richColors />
<Navbar />
<Sidebar />
<motion.div
	animate={!motionDisabled && sidebarShown
		? {
				marginLeft: '200px'
			}
		: {
				marginLeft: 0
			}}
	transition={{
		bounceDamping: 20,
		damping: 0.2
	}}
	class="min-h-screen mt-[60px] overflow-x-hidden"
>
	{@render children?.()}
	<Footer />
</motion.div>
