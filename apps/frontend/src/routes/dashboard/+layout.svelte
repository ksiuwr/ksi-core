<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	const session = authClient.useSession();

	const { children } = $props();

	$effect(() => {
		if (!$session.isPending && !$session.data) {
			goto('/');
		}
	});
</script>

{@render children()}
