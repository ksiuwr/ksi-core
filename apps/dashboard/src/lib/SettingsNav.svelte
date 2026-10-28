<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { slider } from '@ksi-core/ui/platform/slider';
  import type { Component } from 'svelte';

  type Item = { id: string; label: string; icon?: Component<{ size?: number }>; danger?: boolean };

  let { items, label }: { items: Item[]; label: string } = $props();

  let active = $state(untrack(() => items[0]?.id ?? ''));

  // Marks the section crossing the upper third of the viewport as current.
  onMount(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => !!section);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) active = visible[0]!.target.id;
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  });
</script>

<nav class="settings-nav" aria-label={label} use:slider>
  {#each items as item (item.id)}
    <a
      href={`#${item.id}`}
      class:active={active === item.id}
      class:danger={item.danger}
      aria-current={active === item.id ? 'location' : undefined}
      onclick={() => (active = item.id)}
    >
      {#if item.icon}<item.icon size={15} />{/if}{item.label}
    </a>
  {/each}
</nav>
