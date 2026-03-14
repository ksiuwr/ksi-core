<script lang="ts">
	import { TableProperties } from '@lucide/svelte';
	import Wrapper from '../../../components/Wrapper.svelte';
	import { api } from '$lib/backend';

	let cachedMap = $state<Awaited<ReturnType<typeof api.dashboard.admin.s3cache.get>>['data']>();

	$effect(() => {
		fetch();
	});

	const fetch = () => {
		api.dashboard.admin.s3cache.get().then((r) => {
			cachedMap = r.data;
		});
	};

	const refetch = (key: string) => {
		api.dashboard.admin
			.s3cache({ id: key })
			.post()
			.then(() => fetch());
	};
</script>

{#snippet icon()}
	<TableProperties class="size-4" />
{/snippet}

<Wrapper name="dashboard/s3cache" {icon}>
	<h2 class="text-2xl">S3 cache</h2>
	Zarządzaj cache zasobów przechowywanych w Cloudflare R2 storage
	<div class="flex flex-col my-8 gap-4">
		{#if cachedMap}
			{#each Object.keys(cachedMap) as key}
				<p>{key} [{cachedMap[key].data.length}]</p>
				<button class="btn btn-outline inline-flex" onclick={() => refetch(key)}>refetch</button>
				<p class="opacity-70">
					{new Date(cachedMap[key].time).toLocaleDateString()}
					{new Date(cachedMap[key].time).toLocaleTimeString()}
				</p>
				<div class="p-4 font-mono bg-base-200">
					{#each cachedMap[key].data as line}
						<p>{line}</p>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</Wrapper>
