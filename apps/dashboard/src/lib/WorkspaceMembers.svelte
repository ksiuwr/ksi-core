<script lang="ts">
  import { Github, Linkedin, ArrowLeft, Search } from '@lucide/svelte';
  import Skeleton from './Skeleton.svelte';
  import MemberPreview from './MemberPreview.svelte';
  let {
    projectId,
    memberId,
    websiteOrigin,
    elevated = false,
    canManage = false
  }: {
    canManage?: boolean;
    projectId?: string;
    memberId?: string;
    websiteOrigin: string;
    elevated?: boolean;
  } = $props();
  type Member = {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string | null;
    image: string | null;
    bio: string | null;
    role: string;
    leader?: boolean;
    github?: string | null;
    linkedin?: string | null;
  };
  let members = $state<Member[]>([]),
    person = $state<Member | null>(null),
    loading = $state(true),
    error = $state(''),
    search = $state('');
  let reloadKey = $state(0),
    busy = $state(false),
    removing = $state<string | null>(null),
    requests = $state<
      { request: { id: string; userId: string }; firstName: string; lastName: string }[]
    >([]);
  let generation = 0;
  const manageable = $derived(canManage && !!projectId && !memberId);
  const leaderIds = $derived(members.filter((m) => m.leader).map((m) => m.id));

  async function manage(work: () => Promise<Response>) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const response = await work();
      if (!response.ok) throw new Error('Unable to update members.');
      removing = null;
      reloadKey++;
    } catch (cause) {
      error = (cause as Error).message;
    } finally {
      busy = false;
    }
  }
  const projectApi = (path: string, method: string, body?: unknown) =>
    fetch(`/api/platform/projects/${encodeURIComponent(projectId!)}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  function setLeader(id: string, leader: boolean) {
    const userIds = leader ? [...leaderIds, id] : leaderIds.filter((value) => value !== id);
    void manage(() => projectApi('/leaders', 'PUT', { userIds }));
  }

  $effect(() => {
    void reloadKey;
    if (!manageable) return;
    void projectApi('/join-requests', 'GET')
      .then((response) => (response.ok ? response.json() : []))
      .then((result) => (requests = result))
      .catch(() => (requests = []));
  });
  const filtered = $derived(
    members.filter((m) =>
      `${m.firstName} ${m.lastName} ${m.nickname ?? ''}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    )
  );
  function role(m: Member) {
    return m.leader
      ? 'Project leader'
      : m.role === 'administrator'
        ? 'Administrator'
        : m.role === 'board'
          ? 'Board member'
          : 'Member';
  }
  $effect(() => {
    const path = memberId
      ? `/members/${encodeURIComponent(memberId)}`
      : projectId
        ? `/projects/${encodeURIComponent(projectId)}/members`
        : '/members';
    void reloadKey;
    const current = ++generation;
    loading = reloadKey === 0;
    error = '';
    void fetch(`/api/platform${path}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load members.');
        const result = await response.json();
        if (current !== generation) return;
        if (memberId) person = result;
        else members = result;
      })
      .catch((e) => {
        if (current === generation) error = e.message;
      })
      .finally(() => {
        if (current === generation) loading = false;
      });
  });
</script>

{#if loading}<Skeleton label="Loading members" />{:else if error}<p class="error" role="alert">
    {error}
  </p>{:else if person}
  <a class="btn btn-outline" href="/association/members"><ArrowLeft size={15} />{'Members'}</a>
  <section class="card person">
    {#if person.image}<img class="portrait" src={person.image} alt="" />{/if}
    <div>
      <h1>{person.firstName} {person.lastName}</h1>
      <a class="btn btn-outline" href={`${websiteOrigin}/members/${encodeURIComponent(person.id)}`}
        >View public profile</a
      >
      {#if person.nickname}<p>aka. {person.nickname}</p>{/if}
      <p class="muted">{role(person)}</p>
      <p class="bio">{person.bio}</p>
      <div class="row">
        {#if person.github}<a
            class="btn btn-outline"
            href={person.github}
            rel="noopener noreferrer"
            target="_blank"><Github size={16} />GitHub</a
          >{/if}{#if person.linkedin}<a
            class="btn btn-outline"
            href={person.linkedin}
            rel="noopener noreferrer"
            target="_blank"><Linkedin size={16} />LinkedIn</a
          >{/if}
        {#if elevated}<a class="btn btn-outline" href={`/members/${encodeURIComponent(person.id)}`}
            >Manage account</a
          >{/if}
      </div>
    </div>
  </section>
{:else}
  <div class="workspace-header">
    <h1>Members</h1>
    <label class="search"
      ><Search size={16} /><input
        aria-label="Search members"
        placeholder="Name or nickname…"
        bind:value={search}
      /></label
    >
  </div>
  {#if manageable && requests.length}
    <section class="card requests">
      <h2>Join requests</h2>
      {#each requests as request (request.request.id)}
        <div class="request">
          <a href={`/people/${encodeURIComponent(request.request.userId)}`}
            >{request.firstName} {request.lastName}</a
          >
          <div class="row">
            <button
              class="btn btn-outline btn-sm"
              disabled={busy}
              onclick={() =>
                manage(() =>
                  projectApi(`/join-requests/${request.request.id}`, 'POST', { accept: true })
                )}>Accept</button
            ><button
              class="btn btn-outline btn-sm"
              disabled={busy}
              onclick={() =>
                manage(() =>
                  projectApi(`/join-requests/${request.request.id}`, 'POST', { accept: false })
                )}>Decline</button
            >
          </div>
        </div>
      {/each}
    </section>
  {/if}
  <div class="table-wrap">
    <table>
      <thead
        ><tr
          ><th>Person</th><th>Role</th><th class="bio-cell">About</th>{#if manageable}<th
            ></th>{/if}</tr
        ></thead
      ><tbody>
        {#each filtered as member}<tr
            ><td
              ><MemberPreview
                {member}
                href={`/people/${encodeURIComponent(member.id)}`}
                role={role(member)}
              /></td
            ><td>{role(member)}</td><td class="bio-cell">{member.bio}</td>{#if manageable}<td
                class="actions"
                >{#if removing === member.id}<button
                    class="btn btn-outline btn-sm danger-button"
                    disabled={busy}
                    onclick={() => manage(() => projectApi(`/members/${member.id}`, 'DELETE'))}
                    >Confirm removal</button
                  ><button class="btn btn-outline btn-sm" onclick={() => (removing = null)}
                    >Cancel</button
                  >{:else}<button
                    class="btn btn-outline btn-sm"
                    disabled={busy || (member.leader && leaderIds.length <= 1)}
                    onclick={() => setLeader(member.id, !member.leader)}
                    >{member.leader ? 'Remove leader' : 'Make leader'}</button
                  ><button
                    class="btn btn-outline btn-sm"
                    disabled={busy}
                    onclick={() => (removing = member.id)}>Remove from project</button
                  >{/if}</td
              >{/if}</tr
          >{/each}
      </tbody>
    </table>
  </div>
  {#if !filtered.length}<p class="muted">No matching members.</p>{/if}
{/if}

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 320px;
  }
  .search input {
    margin: 0;
  }
  .actions {
    text-align: right;
    white-space: nowrap;
  }
  .actions :global(.btn) {
    margin-left: 6px;
  }
  .requests {
    margin-bottom: 16px;
  }
  .requests h2 {
    margin-bottom: 8px;
  }
  .request {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
  }
  .request a {
    color: var(--ink);
  }
  .bio-cell {
    max-width: 360px;
    overflow-wrap: anywhere;
  }
  .bio {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .person {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 24px;
    margin-top: 24px;
  }
  .portrait {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
  }
  @media (max-width: 600px) {
    .workspace-header {
      display: grid;
      gap: 16px;
    }
    .bio-cell {
      display: none;
    }
    .person {
      grid-template-columns: 1fr;
    }
  }
</style>
