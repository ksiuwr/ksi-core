<script lang="ts">
	import { themeStore } from '$lib/themeStore';
	import { Moon, Sun } from '@lucide/svelte';
	import { motion } from 'motion-start';
</script>

<button
	onclick={() => {
		const newTheme = $themeStore === 'dark' ? 'light' : 'dark';
		themeStore.set(newTheme);
	}}
	class="btn btn-square btn-outline size-[60px] border-0 border-base-200 border-l rounded-none"
>
	{#if $themeStore === 'dark'}
		<motion.div animate={{ rotateZ: 0 }} exit={{ rotateZ: 90 }} initial={{ rotateZ: -90 }}>
			<Moon class="w-4 h-4" />
		</motion.div>
	{:else if $themeStore === 'light'}
		<motion.div animate={{ rotateZ: 0 }} exit={{ rotateZ: -90 }} initial={{ rotateZ: 90 }}>
			<Sun class="w-4 h-4" />
		</motion.div>
	{/if}
</button>
