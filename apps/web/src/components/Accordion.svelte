<script lang="ts">
  import { accordionStore } from '$lib/accordion';
  import { motion } from 'motion-start';
  import type { Snippet } from 'svelte';

  const {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();

  let id = $derived(title.slice(0, 4).toLowerCase());

  let show = $derived($accordionStore === id);
</script>

<button
  role="switch"
  class={[
    'hover:bg-primary/10 border-base-300 rounded-box flex w-full cursor-pointer flex-col gap-2 border p-4 transition-colors',
    show && 'bg-primary/10'
  ]}
  aria-checked={show}
  onclick={() => {
    if (show) {
      $accordionStore = '';
    } else {
      $accordionStore = id;
    }
  }}
>
  <div class={'flex items-center justify-between transition-colors'}>
    <h1 class="text-[clamp(2rem,2cqw,4rem)]">{title}</h1>
  </div>
  <motion.div
    animate={show ? { height: 'auto' } : { height: 0 }}
    initial={{
      height: 0
    }}
    class="overflow-hidden"
  >
    <div class="bg-base-content/20 my-4 h-px w-full"></div>
    {@render children()}
  </motion.div>
</button>
