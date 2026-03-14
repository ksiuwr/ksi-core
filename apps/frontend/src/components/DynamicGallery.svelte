<script lang="ts">
	import { api, resolveError } from '$lib/backend';
	import { toast } from 'svelte-sonner';
	import Gallery from './Gallery.svelte';
	import type { Snippet } from 'svelte';

	let { id, empty }: { id: string; empty?: Snippet } = $props();

	let loading = $state(true);
	let images = $state<string[]>([]);

	$effect(() => {
		api
			.gallery({ id })
			.get()
			.then((r) => {
				loading = false;
				if (r.data) {
					images = r.data.images;
					return;
				}
				toast.error(resolveError(r.error));
			});
	});
</script>

{#if loading}{:else if images.length > 0}
	<Gallery {images} />
{:else if empty}
	{@render empty()}
{/if}
