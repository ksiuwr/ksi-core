<script lang="ts">
  import { Megaphone, Pencil, Plus, Trash, X } from '@lucide/svelte';
  import Wrapper from '../../../components/Wrapper.svelte';
  import { api, resolveError } from '$lib/backend';
  import { toast } from 'svelte-sonner';
  import ms from 'ms';

  type Alert = NonNullable<
    Awaited<ReturnType<typeof api.dashboard.admin.alerts.get>>['data']
  >['results'][number];

  let alerts = $state<Alert[]>([]);
  let pageCount = $state(0);
  let currentPage = $state(0);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  let pages = $derived(
    [...new Set([0, currentPage - 1, currentPage, currentPage + 1, pageCount - 1])]
      .filter((page) => page >= 0 && page < pageCount)
      .sort((a, b) => a - b)
  );

  let creating = $state(false);
  let editingId = $state<string | null>(null);
  let saving = $state(false);
  let deletingId = $state<string | null>(null);
  let newAlert = $state(createInitialAlert());

  function createInitialAlert() {
    return {
      title: '',
      description: '',
      color: 'neutral' as 'neutral' | 'info' | 'warning' | 'danger',
      startDate: new Date(),
      endDate: new Date(Date.now() + ms('7d')),
      priority: 0,
      link: ''
    };
  }

  async function fetchAlerts(page: number) {
    loading = true;
    loadError = null;

    const response = await api.dashboard.admin.alerts.get({
      query: { page }
    });

    if (response.error) {
      loadError = resolveError(response.error);
      toast.error(loadError);
      loading = false;
      return;
    }

    alerts = response.data.results;
    pageCount = response.data.pages;
    loading = false;

    const lastPage = Math.max(0, pageCount - 1);
    if (currentPage > lastPage) currentPage = lastPage;
  }

  $effect(() => {
    void fetchAlerts(currentPage);
  });

  function resetForm() {
    creating = false;
    editingId = null;
    newAlert = createInitialAlert();
  }

  function startEditing(alert: Alert) {
    newAlert = {
      title: alert.title,
      description: alert.description,
      color: alert.color,
      startDate: new Date(alert.startDate),
      endDate: new Date(alert.endDate),
      priority: alert.priority || 0,
      link: alert.link || ''
    };
    editingId = alert.id;
    creating = true;
  }

  async function saveAlert(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    saving = true;

    if (editingId) {
      const response = await api.dashboard.admin.alerts({ id: editingId }).put({
        ...newAlert,
        priority: newAlert.priority || undefined,
        link: newAlert.link
      });
      if (response.error) {
        toast.error(resolveError(response.error));
        saving = false;
        return;
      }
      toast.success('Alert updated successfully');
    } else {
      const response = await api.dashboard.admin.alerts.post({
        ...newAlert,
        priority: newAlert.priority || undefined,
        link: newAlert.link || undefined
      });
      if (response.error) {
        toast.error(resolveError(response.error));
        saving = false;
        return;
      }
      toast.success('Alert created successfully');
    }

    saving = false;
    resetForm();
    await fetchAlerts(currentPage);
  }

  async function deleteAlert(alert: Alert) {
    if (!window.confirm(`Delete “${alert.title}”? This action cannot be undone.`)) return;

    deletingId = alert.id;
    const response = await api.dashboard.admin.alerts({ id: alert.id }).delete();
    if (response.error) {
      toast.error(resolveError(response.error));
      deletingId = null;
      return;
    }

    toast.success('Alert deleted');
    deletingId = null;
    await fetchAlerts(currentPage);
  }

  function formatDateForInput(date: Date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 16);
  }

  function formatLocalDate(date: Date | string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  }

  function alertStatus(alert: Alert) {
    const now = Date.now();
    if (new Date(alert.startDate).getTime() > now) return 'scheduled';
    if (new Date(alert.endDate).getTime() < now) return 'expired';
    return 'active';
  }

  function statusClass(status: ReturnType<typeof alertStatus>) {
    if (status === 'active') return 'border-success/30 bg-success/10 text-success';
    if (status === 'scheduled') return 'border-info/30 bg-info/10 text-info';
    return 'border-base-content/20 bg-base-200 text-base-content/55';
  }

  function colorClass(color: Alert['color']) {
    if (color === 'danger') return 'border-error/30 bg-error/10 text-error';
    if (color === 'warning') return 'border-warning/30 bg-warning/10 text-warning';
    if (color === 'info') return 'border-info/30 bg-info/10 text-info';
    return 'border-base-content/20 bg-base-200 text-base-content/65';
  }
</script>

{#snippet icon()}
  <Megaphone class="size-4" />
{/snippet}

<Wrapper name="dashboard / alerts" {icon}>
  <header
    class="flex flex-col gap-8 border-b border-base-content/15 pb-10 md:flex-row md:items-end md:justify-between"
  >
    <div>
      <p class="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">Announcements</p>
      <h1 class="mb-0! text-4xl tracking-[-0.04em] sm:text-5xl">Alerts</h1>
      <p class="mt-4 max-w-2xl text-lg leading-relaxed text-base-content/65">
        Schedule and maintain the notices displayed at the top of the public website.
      </p>
    </div>
    {#if !creating}
      <button
        class="btn btn-primary w-fit gap-2 px-5"
        type="button"
        onclick={() => (creating = true)}
      >
        <Plus class="size-4" />
        New alert
      </button>
    {/if}
  </header>

  {#if creating}
    <section class="border-b border-base-content/15 py-10" aria-labelledby="editor-heading">
      <form class="border border-base-content/20 bg-base-100" onsubmit={saveAlert}>
        <div
          class="flex items-center justify-between border-b border-base-content/15 px-5 py-4 md:px-7"
        >
          <div>
            <p class="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-primary">Editor</p>
            <h2 id="editor-heading" class="mb-0! text-2xl">
              {editingId ? 'Edit alert' : 'Create alert'}
            </h2>
          </div>
          <button
            class="btn btn-square btn-ghost btn-sm"
            type="button"
            onclick={resetForm}
            aria-label="Close alert editor"
            disabled={saving}
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="grid gap-6 p-5 md:grid-cols-2 md:p-7">
          <label class="form-control w-full">
            <span class="mb-2 text-sm font-bold">Title</span>
            <input
              type="text"
              placeholder="Maintenance notice"
              class="input input-bordered w-full"
              bind:value={newAlert.title}
              required
            />
          </label>

          <label class="form-control w-full">
            <span class="mb-2 text-sm font-bold">Display style</span>
            <select class="select select-bordered w-full" bind:value={newAlert.color}>
              <option value="neutral">Neutral</option>
              <option value="info">Information</option>
              <option value="warning">Warning</option>
              <option value="danger">Danger</option>
            </select>
          </label>

          <label class="form-control w-full">
            <span class="mb-2 text-sm font-bold">Starts at</span>
            <input
              type="datetime-local"
              class="input input-bordered w-full"
              value={formatDateForInput(newAlert.startDate)}
              oninput={(event) => (newAlert.startDate = new Date(event.currentTarget.value))}
              required
            />
            <span class="mt-2 font-mono text-xs text-base-content/45">Your local time</span>
          </label>

          <label class="form-control w-full">
            <span class="mb-2 text-sm font-bold">Ends at</span>
            <input
              type="datetime-local"
              class="input input-bordered w-full"
              value={formatDateForInput(newAlert.endDate)}
              oninput={(event) => (newAlert.endDate = new Date(event.currentTarget.value))}
              required
            />
            <span class="mt-2 font-mono text-xs text-base-content/45">Your local time</span>
          </label>

          <label class="form-control w-full">
            <span class="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
              Priority
              <span class="font-mono text-xs font-normal text-base-content/45">Optional</span>
            </span>
            <input
              type="number"
              step="1"
              placeholder="0"
              class="input input-bordered w-full"
              bind:value={newAlert.priority}
            />
          </label>

          <label class="form-control w-full">
            <span class="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
              Link
              <span class="font-mono text-xs font-normal text-base-content/45">Optional</span>
            </span>
            <input
              type="url"
              placeholder="https://example.com"
              class="input input-bordered w-full"
              bind:value={newAlert.link}
            />
          </label>

          <label class="form-control w-full md:col-span-2">
            <span class="mb-2 text-sm font-bold">Description</span>
            <textarea
              class="textarea textarea-bordered min-h-32 w-full text-base leading-relaxed"
              placeholder="Explain what visitors need to know…"
              bind:value={newAlert.description}
              required
            ></textarea>
          </label>
        </div>

        <div
          class="flex flex-col-reverse gap-3 border-t border-base-content/15 p-5 sm:flex-row sm:justify-end md:px-7"
        >
          <button class="btn btn-ghost" type="button" onclick={resetForm} disabled={saving}
            >Cancel</button
          >
          <button class="btn btn-primary min-w-36" type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create alert'}
          </button>
        </div>
      </form>
    </section>
  {/if}

  <section class="py-10 md:py-14" aria-labelledby="alert-list-heading" aria-busy={loading}>
    <div class="mb-7 flex items-end justify-between gap-4">
      <div>
        <p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          01 / Published records
        </p>
        <h2 id="alert-list-heading" class="mb-0! text-2xl tracking-tight sm:text-3xl">
          All alerts
        </h2>
      </div>
      {#if !loading && !loadError}
        <span class="font-mono text-xs text-base-content/45"
          >Page {currentPage + 1} / {Math.max(pageCount, 1)}</span
        >
      {/if}
    </div>

    {#if loading}
      <div class="border border-base-content/15 p-8 text-center" role="status">
        <p class="font-mono text-sm text-base-content/55">Loading alerts…</p>
      </div>
    {:else if loadError}
      <div class="border border-error/30 bg-error/5 p-6">
        <p class="font-bold text-error">Alerts could not be loaded.</p>
        <p class="mt-1 text-sm text-base-content/65">{loadError}</p>
        <button
          class="btn btn-outline btn-sm mt-4"
          type="button"
          onclick={() => void fetchAlerts(currentPage)}
        >
          Try again
        </button>
      </div>
    {:else if alerts.length === 0}
      <div class="border border-dashed border-base-content/25 px-6 py-14 text-center">
        <Megaphone class="mx-auto mb-4 size-8 text-base-content/30" strokeWidth={1.5} />
        <h3 class="mb-2! text-xl">No alerts on this page</h3>
        <p class="text-base-content/55">Create an alert to publish the first announcement.</p>
      </div>
    {:else}
      <div class="grid gap-px border border-base-content/15 bg-base-content/15">
        {#each alerts as alert (alert.id)}
          {@const status = alertStatus(alert)}
          <article class="bg-base-100 p-5 md:p-7">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    class={`border px-2 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] ${statusClass(status)}`}
                  >
                    {status}
                  </span>
                  <span
                    class={`border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] ${colorClass(alert.color)}`}
                  >
                    {alert.color}
                  </span>
                  {#if alert.priority}
                    <span
                      class="border border-base-content/15 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-base-content/50"
                    >
                      Priority {alert.priority}
                    </span>
                  {/if}
                </div>
                <h3 class="mb-2! text-xl tracking-tight sm:text-2xl">{alert.title}</h3>
                <p class="mb-4 font-mono text-xs leading-relaxed text-base-content/50">
                  {formatLocalDate(alert.startDate)} — {formatLocalDate(alert.endDate)}
                </p>
                <p
                  class="wrap-anywhere max-w-4xl whitespace-pre-wrap leading-relaxed text-base-content/75"
                >
                  {alert.description}
                </p>
                {#if alert.link}
                  <a
                    href={alert.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link link-primary mt-4 inline-block max-w-full wrap-anywhere text-sm"
                    >{alert.link}</a
                  >
                {/if}
              </div>

              <div class="flex shrink-0 gap-1 self-end sm:self-start">
                <button
                  class="btn btn-square btn-ghost btn-sm"
                  type="button"
                  onclick={() => startEditing(alert)}
                  aria-label={`Edit ${alert.title}`}
                  disabled={deletingId === alert.id}
                >
                  <Pencil class="size-4" />
                </button>
                <button
                  class="btn btn-square btn-ghost btn-sm text-error"
                  type="button"
                  onclick={() => void deleteAlert(alert)}
                  aria-label={`Delete ${alert.title}`}
                  disabled={deletingId !== null}
                >
                  {#if deletingId === alert.id}
                    <span class="text-xs" aria-hidden="true">…</span>
                  {:else}
                    <Trash class="size-4" />
                  {/if}
                </button>
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}

    {#if !loading && !loadError && pageCount > 1}
      <nav class="mt-8 flex flex-wrap justify-center gap-2" aria-label="Alerts pagination">
        {#each pages as page}
          <button
            class={currentPage === page
              ? 'btn btn-square btn-sm btn-primary'
              : 'btn btn-square btn-sm btn-outline'}
            type="button"
            aria-label={`Go to page ${page + 1}`}
            aria-current={currentPage === page ? 'page' : undefined}
            onclick={() => (currentPage = page)}>{page + 1}</button
          >
        {/each}
      </nav>
    {/if}
  </section>
</Wrapper>
