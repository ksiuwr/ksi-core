<script lang="ts">
  import { Selector, Text } from '@astryx-sv/core';
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
  const options = $derived<{ value: string; label: string; description?: string }[]>([
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

<Selector
  {id}
  {label}
  {value}
  {options}
  onChange={(next: string) => (value = next)}
  isDisabled={disabled}
  hasSearch
  searchPlaceholder={'Szukaj folderów'}
  width="100%"
>
  {#snippet renderValue()}
    <Text type="inherit" maxLines={1}>{selectedPath}</Text>
  {/snippet}
</Selector>
