<script lang="ts">
  import { X } from '@lucide/svelte';

  type User = { id: string; name: string; nickname: string | null; image: string | null };
  let {
    userIds = $bindable([]),
    api
  }: {
    userIds: string[];
    api: <T>(path: string) => Promise<T>;
  } = $props();

  let query = $state('');
  let results = $state<User[]>([]);
  let selectedUsers = $state<User[]>([]);
  let loading = $state(false);

  async function search() {
    if (!query.trim()) {
      results = [];
      return;
    }
    loading = true;
    try {
      const users = await api<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
      results = users.filter((u) => !userIds.includes(u.id));
    } catch {
      results = [];
    } finally {
      loading = false;
    }
  }

  function selectUser(user: User) {
    if (!userIds.includes(user.id)) {
      userIds = [...userIds, user.id];
      selectedUsers = [...selectedUsers, user];
    }
    query = '';
    results = [];
  }

  function removeUser(id: string) {
    userIds = userIds.filter((uid) => uid !== id);
    selectedUsers = selectedUsers.filter((u) => u.id !== id);
  }
</script>

<div class="user-select">
  <div class="selected-users">
    {#each selectedUsers as user}
      <div class="selected-user">
        {#if user.image}
          <img src={user.image} alt={user.name} class="avatar" />
        {/if}
        <span>{user.name}</span>
        <button type="button" class="remove-btn" onclick={() => removeUser(user.id)}>
          <X size={14} />
        </button>
      </div>
    {/each}
  </div>

  <div class="search-container">
    <input
      type="text"
      bind:value={query}
      oninput={search}
      placeholder="Szukaj użytkowników…"
      class="search-input"
    />
    {#if query.trim() && results.length > 0}
      <div class="search-results">
        {#each results as user}
          <button type="button" class="result-item" onclick={() => selectUser(user)}>
            {#if user.image}
              <img src={user.image} alt={user.name} class="avatar" />
            {/if}
            <div class="user-info">
              <span class="name">{user.name}</span>
              {#if user.nickname}
                <span class="nickname">@{user.nickname}</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .user-select {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .selected-users {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .selected-user {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--surface-muted);
    border: 1px solid var(--line);
    border-radius: var(--radius-full);
    font-size: 13px;
  }
  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 0;
  }
  .remove-btn:hover {
    color: var(--danger);
  }
  .search-container {
    position: relative;
  }
  .search-input {
    width: 100%;
  }
  .search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 4px;
    box-shadow: var(--shadow-md);
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    display: flex;
    flex-direction: column;
  }
  .result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    width: 100%;
  }
  .result-item:hover {
    background: var(--surface-muted);
  }
  .result-item:last-child {
    border-bottom: none;
  }
  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }
  .user-info {
    display: flex;
    flex-direction: column;
  }
  .name {
    font-weight: 500;
    color: var(--text);
  }
  .nickname {
    font-size: 11px;
    color: var(--muted);
  }
</style>
