<script lang="ts">
	import { motion } from 'motion-start';
	import '../app.css';
	import Navbar from '../components/Navbar.svelte';
	import Sidebar from '../components/Sidebar.svelte';
	import { sidebarStore } from '$lib/sidebar';
	import Footer from '../components/Footer.svelte';

	const { children } = $props();
	let sidebarShown = $derived($sidebarStore);
</script>

<svelte:head>
	<title>KSI UWr</title>
</svelte:head>

<Navbar />
<Sidebar />
<motion.div
	animate={sidebarShown
		? {
				paddingLeft: '140px'
			}
		: {
				paddingLeft: 0
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
