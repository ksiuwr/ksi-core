<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { Selector, Text, TextArea, VStack } from '@astryx-sv/core';
  import { permissions, permissionKeys, polishPermissionDescriptions } from 'shared/permissions';

  let { flags = $bindable([]), disabled = false }: { flags: string[]; disabled?: boolean } =
    $props();
  const language = $derived(preferences.language);
  let mode = $state('+');
  const groups = [
    ...new Set(
      permissionKeys.flatMap((key) => {
        const parts = key.split('.');
        return parts.slice(1).map((_, index) => parts.slice(0, index + 1).join('.') + '.*');
      })
    )
  ];
  const descriptions = $derived(language === 'pl' ? polishPermissionDescriptions : permissions);
  const options = $derived([
    ...permissionKeys.map((key) => ({ value: key, label: key, description: descriptions[key] })),
    ...groups.map((pattern) => ({
      value: pattern,
      label: pattern,
      description: 'Wszystkie uprawnienia z tej grupy, również dodane w przyszłości.'
    }))
  ]);
  function add(pattern: string) {
    if (!pattern) return;
    const flag = mode + pattern;
    if (!flags.includes(flag)) flags = [...flags, flag];
  }
</script>

<VStack gap={3} class="permission-editor">
  <Selector
    label="Działanie uprawnienia"
    value={mode}
    options={[
      { value: '+', label: 'Nadaj (+)' },
      { value: '-', label: 'Odmów (−)' }
    ]}
    isDisabled={disabled || flags.length >= 100}
    onChange={(value: string) => (mode = value)}
  />
  <Selector
    label="Znajdź uprawnienie"
    placeholder="Dodaj uprawnienie…"
    {options}
    hasSearch
    searchPlaceholder="Szukaj nazw lub opisów…"
    isDisabled={disabled || flags.length >= 100}
    onChange={(value: string) => add(value)}
  />
  <Text type="supporting" color="secondary">
    Wyszukaj uprawnienia i ich opisy. Nadania dodają dostęp; odmowy mają pierwszeństwo. Nadal
    obowiązują ograniczenia statusu konta i przestrzeni.
  </Text>
  <TextArea
    label="Wyjątki uprawnień (jeden na linię)"
    rows={6}
    isDisabled={disabled}
    hasSpellCheck={false}
    value={flags.join('\n')}
    onChange={(value) =>
      (flags = value
        .split('\n')
        .map((flag) => flag.trim())
        .filter(Boolean))}
  />
  <Text type="supporting" color="secondary">
    Możesz też wpisać wzorzec, np. -users.profile.edit*. Odmawia on wszystkich pasujących uprawnień,
    również przyszłych.
  </Text>
</VStack>
