<script lang="ts">
  import MemberPreview from '@ksi-core/ui/platform/MemberPreview.svelte';
  import { ArrowUpRight, Github, Linkedin, X } from '@lucide/svelte';
  import { SvelteSet } from 'svelte/reactivity';

  export interface PublicProjectMember {
    id: string;
    name: string;
    image?: string | null;
    bio?: string | null;
    nickname?: string | null;
    github?: string | null;
    linkedin?: string | null;
  }

  type RosterEntry = PublicProjectMember & { isLeader: boolean };

  let {
    leaders = [],
    members = [],
    projectName,
    limit = 20
  }: {
    leaders?: PublicProjectMember[];
    members?: PublicProjectMember[];
    projectName: string;
    limit?: number;
  } = $props();

  const uid = $props.id();
  let open = $state(false);
  let dialog = $state<HTMLDialogElement>();
  const brokenImages = new SvelteSet<string>();

  const roster = $derived.by<RosterEntry[]>(() => {
    const seen = new Set<string>();
    const combined: RosterEntry[] = [];
    for (const leader of leaders) {
      if (seen.has(leader.id)) continue;
      seen.add(leader.id);
      combined.push({ ...leader, isLeader: true });
    }
    for (const member of members) {
      if (seen.has(member.id)) continue;
      seen.add(member.id);
      combined.push({ ...member, isLeader: false });
    }
    return combined;
  });

  const visibleRoster = $derived(roster.slice(0, limit));
  const hiddenCount = $derived(Math.max(0, roster.length - limit));

  function getInitials(name: string | null | undefined): string {
    return (
      (name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .filter((_, index, words) => index === 0 || index === words.length - 1)
        .map((word) => word[0])
        .join('')
        .toUpperCase() || '?'
    );
  }

  function showModal() {
    open = true;
  }

  function closeModal() {
    open = false;
  }

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<div class="project-members">
  <h2 class="members-heading">Członkowie</h2>
  <div class="avatar-row">
    {#each visibleRoster as entry (entry.id)}
      <MemberPreview
        member={entry}
        href={`/members/${encodeURIComponent(entry.id)}`}
        role={entry.isLeader ? 'Lider' : ''}
        tone={entry.isLeader ? 'gold' : 'default'}
        avatarOnly
        size={32}
      />
    {/each}
    {#if hiddenCount > 0}
      <button
        type="button"
        class="avatar-overflow"
        aria-haspopup="dialog"
        aria-label={`Pokaż wszystkich członków (+${hiddenCount})`}
        onclick={showModal}
      >
        +{hiddenCount}
      </button>
    {/if}
  </div>
  <button type="button" class="see-all-button" aria-haspopup="dialog" onclick={showModal}>
    {#if hiddenCount > 0}
      Pokaż więcej (+{hiddenCount})
    {:else}
      Zobacz wszystkich ({roster.length})
    {/if}
  </button>
</div>

{#if open}
  <dialog
    bind:this={dialog}
    class="members-dialog"
    aria-labelledby={`${uid}-title`}
    oncancel={(event) => {
      event.preventDefault();
      closeModal();
    }}
    onclose={closeModal}
    onclick={(event) => {
      if (event.target === dialog) closeModal();
    }}
  >
    <header class="dialog-header">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 id={`${uid}-title`} class="text-lg font-semibold tracking-tight">Członkowie</h2>
          <span class="member-count">{roster.length}</span>
        </div>
        <p class="text-muted mt-0.5 truncate text-xs">{projectName}</p>
      </div>
      <button type="button" class="icon-button" aria-label="Zamknij" onclick={closeModal}>
        <X size={18} aria-hidden="true" />
      </button>
    </header>

    <div class="dialog-body">
      <table class="members-table">
        <thead>
          <tr>
            <th scope="col">Członek</th>
            <th scope="col">Linki</th>
            <th scope="col" class="text-right">Profil</th>
          </tr>
        </thead>
        <tbody>
          {#each roster as entry (entry.id)}
            <tr>
              <td>
                <div class="member-cell">
                  {#if entry.image && !brokenImages.has(entry.id)}
                    <img
                      class="member-avatar"
                      class:leader-avatar={entry.isLeader}
                      src={entry.image}
                      alt=""
                      onerror={() => brokenImages.add(entry.id)}
                    />
                  {:else}
                    <span
                      class="member-initials"
                      class:leader-avatar={entry.isLeader}
                      aria-hidden="true"
                    >
                      {getInitials(entry.name)}
                    </span>
                  {/if}
                  <div class="min-w-0">
                    <div class="font-medium wrap-anywhere" class:leader-name={entry.isLeader}>
                      {entry.name}{#if entry.isLeader}{' '}<span>(Lider)</span>{/if}
                    </div>
                    {#if entry.nickname}
                      <div class="text-muted font-mono text-[11px] wrap-anywhere">
                        aka. {entry.nickname}
                      </div>
                    {/if}
                  </div>
                </div>
              </td>
              <td>
                {#if entry.github || entry.linkedin}
                  <div class="socials-cell">
                    {#if entry.github}
                      <a
                        class="icon-button social-link"
                        href={entry.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="GitHub"
                        aria-label={`GitHub – ${entry.name}`}
                      >
                        <Github size={15} aria-hidden="true" />
                      </a>
                    {/if}
                    {#if entry.linkedin}
                      <a
                        class="icon-button social-link"
                        href={entry.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="LinkedIn"
                        aria-label={`LinkedIn – ${entry.name}`}
                      >
                        <Linkedin size={15} aria-hidden="true" />
                      </a>
                    {/if}
                  </div>
                {:else}
                  <span class="text-muted text-xs">—</span>
                {/if}
              </td>
              <td class="text-right">
                <a
                  class="btn btn-outline btn-sm"
                  href={`/members/${encodeURIComponent(entry.id)}`}
                  onclick={closeModal}
                >
                  Zobacz profil<ArrowUpRight class="text-muted" aria-hidden="true" />
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </dialog>
{/if}

<style>
  .project-members,
  .members-dialog {
    --leader-gold: #b88214;
  }
  :global(:root[data-theme='dark']) .project-members,
  :global(:root[data-theme='dark']) .members-dialog {
    --leader-gold: #e5b84b;
  }
  .project-members {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .members-heading {
    margin: 0;
    font-family: var(--font);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .avatar-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }
  .avatar-overflow {
    display: inline-grid;
    place-items: center;
    min-width: 32px;
    height: 32px;
    padding: 0 7px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-muted);
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition:
      border-color var(--dur-fast) ease,
      color var(--dur-fast) ease;
  }
  .avatar-overflow:hover,
  .avatar-overflow:focus-visible {
    border-color: var(--control-border-hover);
    color: var(--ink);
  }
  .see-all-button {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    transition: color var(--dur-fast) ease;
  }
  .see-all-button:hover,
  .see-all-button:focus-visible {
    color: var(--ink);
  }

  .members-dialog {
    width: min(720px, calc(100vw - 32px));
    max-height: min(80vh, 680px);
    margin: auto;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .members-dialog[open] {
    display: flex;
    flex-direction: column;
  }
  .members-dialog::backdrop {
    background: rgb(12 13 15 / 0.42);
    backdrop-filter: blur(2px);
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--line);
    flex-shrink: 0;
  }
  .member-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--radius-full);
    background: var(--surface-muted);
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
  }
  .dialog-body {
    overflow: auto;
    flex: 1;
  }
  .members-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  .members-table th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 10px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
  }
  .members-table th.text-right {
    text-align: right;
  }
  .members-table td {
    padding: 10px 20px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }
  .members-table tbody tr:last-child td {
    border-bottom: 0;
  }
  .members-table tbody tr:hover {
    background: color-mix(in oklch, var(--surface-muted) 55%, transparent);
  }
  .member-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .member-avatar,
  .member-initials {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .member-avatar {
    object-fit: cover;
  }
  .member-initials {
    display: grid;
    place-items: center;
    background: var(--surface-muted);
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1;
  }
  .leader-avatar {
    box-shadow: 0 0 0 2px var(--leader-gold);
  }
  .leader-name {
    color: var(--leader-gold);
  }
  .socials-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .social-link:hover {
    background: var(--surface-muted);
    color: var(--ink);
  }
  @media (max-width: 540px) {
    .members-table th,
    .members-table td {
      padding: 10px 14px;
    }
  }
</style>
