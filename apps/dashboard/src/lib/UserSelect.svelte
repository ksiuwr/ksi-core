<script lang="ts">
  import { Avatar, HStack, Token, Typeahead, VStack } from '@astryx-sv/core';

  type User = { id: string; name: string; nickname: string | null; image: string | null };
  type UserItem = { id: string; label: string; auxiliaryData: User };
  let {
    userIds = $bindable([]),
    api
  }: {
    userIds: string[];
    api: <T>(path: string) => Promise<T>;
  } = $props();

  let selectedUsers = $state<User[]>([]);

  const source = $derived({
    search: async (query: string): Promise<UserItem[]> => {
      if (!query.trim()) return [];
      try {
        const users = await api<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
        return users
          .filter((user) => !userIds.includes(user.id))
          .map((user) => ({ id: user.id, label: user.name, auxiliaryData: user }));
      } catch {
        return [];
      }
    },
    bootstrap: (): UserItem[] => []
  });

  function selectUser(item: UserItem | null) {
    if (!item) return;
    const user = item.auxiliaryData;
    if (!userIds.includes(user.id)) {
      userIds = [...userIds, user.id];
      selectedUsers = [...selectedUsers, user];
    }
  }

  function removeUser(id: string) {
    userIds = userIds.filter((uid) => uid !== id);
    selectedUsers = selectedUsers.filter((u) => u.id !== id);
  }
</script>

<VStack gap={2}>
  {#if selectedUsers.length}
    <HStack gap={1.5} wrap="wrap">
      {#each selectedUsers as user (user.id)}
        <Token label={user.name} size="sm" onRemove={() => removeUser(user.id)}>
          {#snippet icon()}
            <Avatar src={user.image ?? undefined} name={user.name} size={20} alt="" />
          {/snippet}
        </Token>
      {/each}
    </HStack>
  {/if}

  <Typeahead
    label="Szukaj użytkowników"
    isLabelHidden
    placeholder="Szukaj użytkowników…"
    searchSource={source}
    value={null}
    onChange={selectUser}
    debounceMs={0}
    hasClear={false}
    renderItem={userItem}
  />
</VStack>

{#snippet userItem(item: UserItem)}
  {@const user = item.auxiliaryData}
  <HStack gap={2} vAlign="center">
    <Avatar src={user.image ?? undefined} name={user.name} size="sm" alt="" />
    <VStack gap={0}>
      <span>{user.name}</span>
      {#if user.nickname}<small class="nickname">@{user.nickname}</small>{/if}
    </VStack>
  </HStack>
{/snippet}

<style>
  .nickname {
    color: var(--color-text-secondary);
    font-size: var(--text-supporting-size);
  }
</style>
