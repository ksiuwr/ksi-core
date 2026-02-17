<script>
	import { m } from '$lib/paraglide/messages';
	import Wrapper from '../components/Wrapper.svelte';
</script>

<Wrapper name="ERROR">
	<div class="flex flex-col gap-8 items-center justify-center">
		<h1 class="text-4xl mt-10">{m.plain_weak_moth_belong()}</h1>
		<p class="text-xl">
			{@html m.cuddly_born_skunk_wave()}
		</p>

		<h2 class="text-2xl">
			{@html m.direct_next_newt_relish()}
		</h2>
	</div>
</Wrapper>
