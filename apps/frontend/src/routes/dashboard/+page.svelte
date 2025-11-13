<script lang="ts">
	import { Wrench } from '@lucide/svelte';
	import Wrapper from '../../components/Wrapper.svelte';
</script>

{#snippet dashboardIcon()}
	<Wrench class="size-4" />
{/snippet}

<Wrapper name="DASHBOARD.md" icon={dashboardIcon}>
	<div class="markdown-file">
		<h1>Panel</h1>
	</div>
</Wrapper>
