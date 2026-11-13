<script lang="ts">
  import { Avatar, HStack, Text } from '@astryx-sv/core';
  import type { Person } from './docs';

  // Used inside row links, where a member preview (itself a link) would nest anchors.
  let {
    person,
    size = 20,
    showName = true
  }: { person: Person; size?: number; showName?: boolean } = $props();
  // Astryx avatars come in a fixed set of pixel sizes; pick the nearest one.
  const avatarSize = $derived(
    size <= 16 ? 16 : size <= 20 ? 20 : size <= 24 ? 24 : size <= 28 ? 32 : size <= 36 ? 36 : 40
  );
</script>

<HStack gap={1.5} vAlign="center" class="doc-person">
  <Avatar src={person.image ?? undefined} name={person.name} alt="" size={avatarSize} />
  {#if showName}
    <Text type="inherit" maxLines={1} class="doc-person-name">{person.name}</Text>
  {:else}
    <span class="sr-only">{person.name}</span>
  {/if}
</HStack>

<style>
  :global(.doc-person) {
    min-width: 0;
  }
  :global(.doc-person-name) {
    min-width: 0;
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
