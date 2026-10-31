<script lang="ts">
  import { preferences } from '$lib/preferences.svelte';
  import { goto } from '$app/navigation';
  import Editor from '@ksi-core/ui/platform/Editor.svelte';
  import UserSelect from '$lib/UserSelect.svelte';
  import { api, errorMessage } from '$lib/api';
  import { ArrowLeft } from '@lucide/svelte';
  import type { Project } from '$lib/types';

  const language = $derived(preferences.language);

  let title = $state('');
  let slug = $state('');
  let markdown = $state('');
  let leaderIds = $state<string[]>([]);
  let busy = $state(false);
  let error = $state('');

  async function create() {
    if (busy || !title.trim()) return;
    busy = true;
    error = '';
    try {
      const result = await api<Project>('/platform/projects', 'POST', {
        slug,
        name: title,
        description: markdown,
        tags: [],
        fields: ['engineering'],
        leaderIds
      });
      await goto(`/projects/${encodeURIComponent(result.slug || result.id)}`);
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busy = false;
    }
  }
</script>

<div class="workspace-header">
  <div>
    <h1>Nowy projekt</h1>
  </div>
  <a class="btn btn-outline" href="/projects"><ArrowLeft size={15} aria-hidden="true" />Wróć</a>
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}
<div class="card" style="max-width: 600px;">
  <label for="cp-title">Nazwa</label>
  <input id="cp-title" bind:value={title} required />
  <label for="cp-slug">Slug</label>
  <input id="cp-slug" bind:value={slug} />
  <label for="cp-leaders">Liderzy</label>
  <UserSelect bind:userIds={leaderIds} {api} />
  <label for="cp-desc">Opis</label>
  <Editor bind:value={markdown} />
  <button class="btn" disabled={busy || !title.trim()} onclick={create} style="margin-top: 12px;">
    Utwórz projekt
  </button>
</div>
