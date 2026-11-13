<script lang="ts">
  import { Check, ChevronRight } from '@lucide/svelte';
  import { List, ListItem, Text, VStack } from '@astryx-sv/core';
  import MenuList from './MenuList.svelte';
  import type { MenuItem } from './menu';

  let {
    items,
    side = 'right',
    onselect,
    label
  }: {
    items: MenuItem[];
    side?: 'left' | 'right';
    onselect: (item: MenuItem) => void;
    label?: string;
  } = $props();

  let openChild = $state<string | null>(null);

  function choose(item: MenuItem) {
    if (item.disabled) return;
    if (item.children?.length) {
      openChild = openChild === item.id ? null : item.id;
      return;
    }
    onselect(item);
  }
</script>

<VStack gap={0} aria-label={label}>
  <List>
    {#each items as item (item.id)}
      <ListItem
        label={item.label}
        description={item.value}
        isDisabled={item.disabled}
        href={item.href}
        onclick={() => choose(item)}
      >
        {#snippet startContent()}
          {#if item.icon}
            {@const ItemIcon = item.icon}
            <ItemIcon size={15} aria-hidden="true" />
          {:else if item.checked}
            <Check size={13} aria-hidden="true" />
          {/if}
        {/snippet}
        {#snippet endContent()}
          {#if item.children?.length}
            <ChevronRight
              size={14}
              aria-hidden="true"
              style={openChild === item.id ? 'transform: rotate(90deg)' : ''}
            />
          {/if}
        {/snippet}
      </ListItem>
      {#if item.children?.length && openChild === item.id}
        <VStack gap={0} paddingInlineStart={4}>
          <MenuList items={item.children} {side} {onselect} />
        </VStack>
      {/if}
    {/each}
  </List>
  {#if !items.length}
    <Text type="supporting" color="secondary">Brak pozycji.</Text>
  {/if}
</VStack>
