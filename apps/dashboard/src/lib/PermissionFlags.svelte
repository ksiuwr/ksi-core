<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
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
    const flag = mode + pattern;
    if (!flags.includes(flag)) flags = [...flags, flag];
  }
</script>

<div class="permission-editor">
  <div class="permission-picker">
    <Dropdown
      label={'Działanie uprawnienia'}
      value={mode}
      options={[
        { value: '+', label: 'Nadaj (+)' },
        { value: '-', label: 'Odmów (−)' }
      ]}
      disabled={disabled || flags.length >= 100}
      onselect={(value) => (mode = value)}
    />
    <Dropdown
      label={'Znajdź uprawnienie'}
      placeholder={'Dodaj uprawnienie…'}
      {options}
      searchable
      searchPlaceholder={'Szukaj nazw lub opisów…'}
      emptyLabel={'Brak pasujących uprawnień'}
      disabled={disabled || flags.length >= 100}
      onselect={add}
    />
  </div>
  <p class="muted help">
    Wyszukaj uprawnienia i ich opisy. Nadania dodają dostęp; odmowy mają pierwszeństwo. Nadal
    obowiązują ograniczenia statusu konta i przestrzeni.
  </p>
  <label for="member-flags">Wyjątki uprawnień (jeden na linię)</label>
  <textarea
    id="member-flags"
    rows="6"
    {disabled}
    spellcheck="false"
    value={flags.join('\n')}
    oninput={(event) =>
      (flags = event.currentTarget.value
        .split('\n')
        .map((flag) => flag.trim())
        .filter(Boolean))}
  ></textarea>
  <p class="muted help">
    Możesz też wpisać wzorzec, np. -users.profile.edit*. Odmawia on wszystkich pasujących uprawnień,
    również przyszłych.
  </p>
</div>

<style>
  .permission-editor {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .permission-picker {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .help {
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }
  textarea {
    margin: 0;
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 540px) {
    .permission-picker {
      grid-template-columns: 1fr;
    }
  }
</style>
