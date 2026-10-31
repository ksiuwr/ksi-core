<script lang="ts">
  import { onMount } from 'svelte';
  import { preferences } from '$lib/preferences.svelte';
  import { formatDateTime } from 'shared/format';
  let { projectSlug }: { projectSlug: string } = $props();
  let credentials = $state<
    {
      previewId: string;
      branch: string;
      commit: string;
      previewUrl: string;
      accounts: { email: string; password: string }[];
      updatedAt: string;
    }[]
  >([]);
  let loading = $state(true);
  let error = $state('');
  async function load() {
    loading = true;
    error = '';
    try {
      const response = await fetch(
        `/api/platform/projects/by-slug/${encodeURIComponent(projectSlug)}/previews`
      );
      const result = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        const code =
          typeof result === 'object' && result !== null && 'code' in result ? result.code : null;
        throw new Error(
          typeof code === 'string' ? code : 'Nie udało się wczytać danych logowania podglądu'
        );
      }
      if (!Array.isArray(result))
        throw new Error('Nie udało się wczytać danych logowania podglądu');
      credentials = result;
    } catch (cause) {
      error =
        cause instanceof Error && cause.message === 'FORBIDDEN'
          ? 'Nie należysz do grupy projektu z dostępem do danych logowania podglądu.'
          : cause instanceof Error
            ? cause.message
            : 'Nie udało się wczytać danych logowania podglądu';
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    void load();
  });
</script>

<div class="workspace-header">
  <h1>Dane logowania podglądu</h1>
  <button class="btn btn-outline" onclick={() => void load()} disabled={loading}>Odśwież</button>
</div>
{#if loading}<p class="muted">Wczytywanie danych logowania…</p>
{:else if error}<p class="error" role="alert">{error}</p>
{:else if !credentials.length}<section class="card">
    <h2>Brak danych logowania dla podglądów</h2>
    <p class="muted">Dane logowania pojawią się tutaj po zakończeniu wdrażania podglądu.</p>
  </section>
{:else}{#each credentials as deployment (deployment.previewId)}<section
      class="card credential-card"
    >
      <h2>{deployment.branch}</h2>
      <p>
        <a href={deployment.previewUrl} target="_blank" rel="noreferrer">{deployment.previewUrl}</a>
      </p>
      <p class="muted">
        Commit <code>{deployment.commit.slice(0, 12)}</code> · Zaktualizowano
        {formatDateTime(deployment.updatedAt, preferences.language)}
      </p>
      <div class="account-list">
        {#each deployment.accounts as account}<article class="account">
            <strong>{account.email}</strong><code>{account.password}</code>
          </article>{/each}
      </div>
      <p class="muted">
        To wspólne konta testowe dla tego podglądu. Nie udostępniaj haseł poza grupą projektu.
      </p>
    </section>{/each}{/if}

<style>
  .credential-card {
    display: grid;
    gap: 12px;
  }
  .credential-card h2,
  .credential-card p {
    margin: 0;
  }
  .account-list {
    display: grid;
    gap: 10px;
  }
  .account {
    display: grid;
    gap: 6px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
  }
  code {
    overflow-wrap: anywhere;
    user-select: all;
  }
</style>
