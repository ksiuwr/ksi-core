<script lang="ts">
  export type AssignmentMember = {
    id: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
  };
  let {
    value = $bindable([]),
    projectId = '',
    members,
    language = 'en',
    readonly = false,
    disabled = false,
    onchange
  }: {
    value?: string[];
    projectId?: string;
    members?: AssignmentMember[];
    language?: 'pl' | 'en';
    readonly?: boolean;
    disabled?: boolean;
    onchange?: (value: string[]) => void;
  } = $props();
  let loaded = $state<AssignmentMember[]>([]),
    error = $state('');
  const choices = $derived(members ?? loaded);
  const name = (id: string) => {
    const person = choices.find((person) => person.id === id);
    return person
      ? [person.firstName, person.lastName].filter(Boolean).join(' ') || person.nickname || id
      : id;
  };
  $effect(() => {
    if (members !== undefined) return;
    const controller = new AbortController();
    const path = projectId ? `/projects/${encodeURIComponent(projectId)}/members` : '/members';
    error = '';
    fetch(`/api/platform${path}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load members');
        const result = await response.json();
        if (!controller.signal.aborted) loaded = result;
      })
      .catch((cause) => {
        if (!controller.signal.aborted) error = cause.message;
      });
    return () => controller.abort();
  });
</script>

{#if readonly}
  <span class="assigned"
    >{#each value as id}<span class="tag">{name(id)}</span>{/each}</span
  >
{:else}<fieldset {disabled}>
    <legend>{language === 'pl' ? 'Przypisane osoby' : 'Assignees'}</legend>
    {#each choices as member (member.id)}<label
        ><input
          type="checkbox"
          checked={value.includes(member.id)}
          onchange={(event) => {
            value = event.currentTarget.checked
              ? [...value, member.id]
              : value.filter((id) => id !== member.id);
            onchange?.(value);
          }}
        />{name(member.id)}</label
      >{/each}
    {#each value.filter((id) => !choices.some((member) => member.id === id)) as id}<label
        ><input
          type="checkbox"
          checked
          onchange={() => {
            value = value.filter((candidate) => candidate !== id);
            onchange?.(value);
          }}
        />{id}</label
      >{/each}
    {#if error}<p role="alert">{error}</p>{/if}
  </fieldset>{/if}

<style>
  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    border: 1px solid var(--line);
    padding: 12px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  input {
    width: auto;
    margin: 0;
  }
  .assigned {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>
