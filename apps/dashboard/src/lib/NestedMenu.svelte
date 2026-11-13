<script lang="ts">
  import type { Snippet } from 'svelte';
  import { DropdownMenu, type DropdownMenuOption } from '@astryx-sv/core';
  import type { MenuItem } from './menu';

  let {
    label,
    items,
    trigger,
    triggerClass = '',
    align = 'end'
  }: {
    label: string;
    items: MenuItem[];
    trigger: Snippet;
    triggerClass?: string;
    align?: 'start' | 'end';
  } = $props();

  function toOptions(source: MenuItem[]): DropdownMenuOption[] {
    const options: DropdownMenuOption[] = [];
    for (const item of source) {
      if (item.separatorBefore) options.push({ type: 'divider' });
      const option: DropdownMenuOption = item.children?.length
        ? {
            id: item.id,
            label: item.label,
            description: item.value,
            icon: item.icon ? undefined : item.checked ? 'check' : undefined,
            items: toOptions(item.children),
            isDisabled: item.disabled
          }
        : {
            id: item.id,
            label: item.label,
            description: item.value,
            icon: item.checked ? 'check' : undefined,
            isDisabled: item.disabled,
            variant: item.danger ? 'destructive' : 'default',
            onClick: () => {
              item.onselect?.();
              if (item.href) window.location.assign(item.href);
            }
          };
      options.push(option);
    }
    return options;
  }

  const options = $derived(toOptions(items));
</script>

<DropdownMenu
  button={{
    label,
    variant: 'ghost',
    size: 'sm',
    isIconOnly: true,
    icon: trigger
  }}
  items={options}
  placement="below"
  alignment={align}
  class={triggerClass}
/>
