<script>
	import { m } from '$lib/paraglide/messages';
	import { File } from '@lucide/svelte';
	import Accordion from '../components/Accordion.svelte';
</script>

<section class="border border-base-200 flex flex-col px-4 mt-[60px] md:px-10 lg:px-20 py-4">
	<code class="opacity-60 flex gap-2 items-center"><File class="size-4" /> README.md</code>
	<div class="w-screen h-px bg-base-200 relative left-1/2 -translate-x-1/2 my-4"></div>
	<!-- <div
		class="bg-white rounded-full size-20 lg:size-40 items-center justify-center text-center flex"
	>
		<p class="w-full text-[4.2cqw] text-base-100 font-bold">koło</p>
	</div> -->
	<!-- <div class="rounded-full size-20 lg:size-40 sticky top-80 left-0 z-10 backdrop-invert"></div> -->
	<div class="markdown-file">
		<h1>Koło Studentów Informatyki</h1>
		<h2>{m.minor_keen_cougar_sew()}</h2>
		<p>W skrócie: KSI, lub ξ</p>
	</div>
</section>
