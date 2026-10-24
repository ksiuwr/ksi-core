<script lang="ts">
  import type { ContentChange } from 'shared/activity';
  let { changes, language = 'pl' }: { changes: ContentChange[]; language?: 'pl' | 'en' } = $props();
  const names: Record<string, [string, string]> = {
    title: ['Tytuł', 'Title'],
    markdown: ['Treść', 'Description'],
    column: ['Status', 'Status'],
    tags: ['Tagi', 'Tags'],
    name: ['Nazwa', 'Name'],
    description: ['Opis', 'Description'],
    dueAt: ['Termin', 'Deadline'],
    assigneeIds: ['Przypisane osoby', 'Assignees']
  };
  const display = (value: unknown) =>
    value === null || value === ''
      ? '∅'
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);
</script>

<div class="changes">
  {#each changes as change}<details>
      <summary>{names[change.field]?.[language === 'pl' ? 0 : 1] ?? change.field}</summary>
      <div class="change-values">
        <div>
          <strong>{language === 'pl' ? 'Przed' : 'Before'}</strong>
          <pre><del>{display(change.before)}</del></pre>
        </div>
        <div>
          <strong>{language === 'pl' ? 'Po' : 'After'}</strong>
          <pre><ins>{display(change.after)}</ins></pre>
        </div>
      </div>
    </details>{/each}
</div>

<style>
  .changes {
    display: grid;
    gap: 8px;
    min-width: 0;
    margin-top: 12px;
  }
  details {
    border: 1px solid var(--line);
    padding: 10px;
  }
  summary {
    cursor: pointer;
  }
  .change-values {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 12px;
    margin-top: 10px;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 320px;
    overflow: auto;
    font: inherit;
  }
  del {
    color: var(--red, #b32c49);
  }
  ins {
    text-decoration: none;
  }
</style>
