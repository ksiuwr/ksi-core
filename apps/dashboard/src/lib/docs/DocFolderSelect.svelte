<script lang="ts">
  import Dropdown, { type DropdownOption } from '@ksi-core/ui/platform/Dropdown.svelte';
  import {
    docFolderDescendants,
    docFolderOptions,
    docFolderPath,
    type DocFolder
  } from 'shared/doc-folders';

  let {
    value = $bindable(''),
    folders,
    label,
    id,
    locale,
    excludeId,
    disabled = false
  }: {
    value?: string;
    folders: DocFolder[];
    label: string;
    id?: string;
    locale: string;
    excludeId?: string;
    disabled?: boolean;
  } = $props();
  const excluded = $derived(
    excludeId ? docFolderDescendants(folders, excludeId) : new Set<string>()
  );
  const options = $derived<DropdownOption[]>([
    { value: '', label: 'Najwyższy poziom' },
    ...docFolderOptions(folders, locale)
      .filter((option) => !excluded.has(option.id))
      .map((option) => {
        const path = docFolderPath(folders, option.id, locale).split('/');
        return {
          value: option.id,
          label: `${'　'.repeat(option.depth)}${option.label}`,
          description: path.length > 1 ? path.slice(0, -1).join(' / ') : undefined
        };
      })
  ]);
  const selectedPath = $derived(
    value ? docFolderPath(folders, value, locale).split('/').join(' / ') : options[0]!.label
  );
</script>

<Dropdown
  bind:value
  {options}
  {label}
  {id}
  {disabled}
  searchable
  searchPlaceholder={'Szukaj folderów'}
  emptyLabel={'Nie znaleziono folderów'}
>
  {#snippet valueContent()}<span title={selectedPath}>{selectedPath}</span>{/snippet}
</Dropdown>
