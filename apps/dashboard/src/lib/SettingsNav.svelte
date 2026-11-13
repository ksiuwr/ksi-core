<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { slider } from '@ksi-core/ui/platform/slider';
  import type { Component } from 'svelte';
  import { List, ListItem, Text } from '@astryx-sv/core';

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
  <List>
    {#each items as item (item.id)}
      <ListItem
        href={`#${item.id}`}
        class={active === item.id ? 'active' : ''}
        isSelected={active === item.id}
        onclick={() => (active = item.id)}
      >
        {#snippet label()}
          <Text as="span" class={item.danger ? 'danger' : ''} color="inherit">
            {item.label}
          </Text>
        {/snippet}
        {#snippet startContent()}
          {#if item.icon}
            {@const ItemIcon = item.icon}
            <ItemIcon size={15} />
          {/if}
        {/snippet}
      </ListItem>
    {/each}
  </List>
</nav>

<style>
  :global(.danger) {
    color: var(--color-error);
  }
</style>
