<script lang="ts">
	import { Wrench } from '@lucide/svelte';
	import Wrapper from '../../components/Wrapper.svelte';
	import { m } from '$lib/paraglide/messages';
</script>

{#snippet dashboardIcon()}
	<Wrench class="size-4" />
{/snippet}

<Wrapper name="dashboard/HOME.md" icon={dashboardIcon}>
	<div class="markdown-file">
		<h1>{m.weak_bright_mammoth_vent()}</h1>
	</div>
</Wrapper>
