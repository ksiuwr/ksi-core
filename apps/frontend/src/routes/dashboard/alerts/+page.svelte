<script>
	import { Megaphone } from '@lucide/svelte';
	import Wrapper from '../../../components/Wrapper.svelte';
</script>

{#snippet icon()}
	<Megaphone class="size-4" />
{/snippet}

<Wrapper containerClassName="markdown-file" name="dashboard/ALERTS.md" {icon}>
	<h2>Alerty</h2>
	Zarządzaj alertem wyświetlanym na górze strony.
</Wrapper>
