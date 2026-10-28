<script lang="ts">
  import type { FrontendLocale } from 'shared/content-locales';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import { permissions, permissionKeys, polishPermissionDescriptions } from 'shared/permissions';
  let {
    flags = $bindable([]),
    language,
    disabled = false
  }: { flags: string[]; language: FrontendLocale; disabled?: boolean } = $props();
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
      description: 'All permissions in this group, including future additions.'
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
      label={'Permission action'}
      value={mode}
      options={[
        { value: '+', label: 'Grant (+)' },
        { value: '-', label: 'Deny (−)' }
      ]}
      disabled={disabled || flags.length >= 100}
      onselect={(value) => (mode = value)}
    />
    <Dropdown
      label={'Find a permission'}
      placeholder={'Add a permission…'}
      {options}
      searchable
      searchPlaceholder={'Search names or descriptions…'}
      emptyLabel={'No matching permissions'}
      disabled={disabled || flags.length >= 100}
      onselect={add}
    />
  </div>
  <p class="muted help">
    {'Search to see every permission and its description. Grants add access; denials take precedence. Status and workspace boundaries still apply.'}
  </p>
  <label for="member-flags">{'Permission flags (one per line)'}</label>
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
    {'You can also enter a pattern, such as -users.profile.edit*. It denies every matching permission, including future ones.'}
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
