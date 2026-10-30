<script lang="ts">
  import type { Person } from './docs';

  // Used inside row links, where a member preview (itself a link) would nest anchors.
  let {
    person,
    size = 20,
    showName = true
  }: { person: Person; size?: number; showName?: boolean } = $props();
  const initials = $derived(
    person.name
      .split(/\s+/)
      .filter(Boolean)
      .filter((_, index, words) => index === 0 || index === words.length - 1)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
</script>

<span class="doc-person" title={person.name} style:--avatar-size={`${size}px`}>
  {#if person.image}<img src={person.image} alt="" />{:else}<span class="doc-person-initials"
      >{initials}</span
    >{/if}{#if showName}<span class="doc-person-name">{person.name}</span>{:else}<span
      class="sr-only">{person.name}</span
    >{/if}
</span>

<style>
  .doc-person {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  img,
  .doc-person-initials {
    flex: 0 0 var(--avatar-size);
    width: var(--avatar-size);
    height: var(--avatar-size);
    border: 1px solid var(--line);
    border-radius: 50%;
    object-fit: cover;
  }
  .doc-person-initials {
    display: grid;
    place-items: center;
    background: var(--surface-muted);
    color: var(--muted);
    font-size: calc(var(--avatar-size) * 0.4);
    font-weight: 600;
    line-height: 1;
  }
  .doc-person-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
