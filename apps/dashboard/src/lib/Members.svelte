<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Skeleton from './Skeleton.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import { ArrowUpRight } from '@lucide/svelte';
  import PermissionFlags from './PermissionFlags.svelte';
  import MemberPreview from './MemberPreview.svelte';
  import { Search, ArrowLeft, Trash2, Save, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { Profile } from 'shared/types';
  let {
    language,
    administrator,
    memberId,
    websiteOrigin
  }: { language: 'pl' | 'en'; administrator: boolean; memberId?: string; websiteOrigin: string } =
    $props();

  const roles = $derived([
    { value: 'member', label: 'Member' },
    { value: 'board', label: 'Board' },
    { value: 'administrator', label: 'Administrator' }
  ]);
  const statuses = $derived([
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'deleted', label: 'Deleted' }
  ]);
  let records = $state<Profile[]>([]),
    total = $state(0),
    member = $state<Profile | null>(null),
    loading = $state(true),
    busy = $state(false),
    error = $state(''),
    notice = $state(''),
    confirmDelete = $state(false),
    search = $state('');
  let emailDraft = $state('');
  let resetConfirmation = $state(false);
  async function resetPassword() {
    if (!member) return;
    busy = true;
    error = '';
    notice = '';
    try {
      await api(`/${member.id}/password-reset`, 'POST');
      notice = 'Password recovery email queued.';
      resetConfirmation = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error';
    } finally {
      busy = false;
    }
  }
  let accessRole = $state<Profile['role']>('member');
  let accessStatus = $state<Profile['membershipStatus']>('pending');
  let accessFlags = $state<string[]>([]);
  const canSaveAccess = $derived(
    member &&
      member.membershipStatus !== 'deleted' &&
      (administrator || (member.role === 'member' && member.membershipStatus === 'pending'))
  );
  const currentPage = $derived(
    Math.max(0, Math.floor(Number(page.url.searchParams.get('page')) || 0))
  );
  const firstResult = $derived(records.length ? currentPage * 50 + 1 : 0);
  const lastResult = $derived(records.length ? currentPage * 50 + records.length : 0);
  function paginate(direction: number) {
    const url = new URL(page.url);
    url.searchParams.set('page', String(Math.max(0, currentPage + direction)));
    void goto(url.pathname + url.search);
  }
  let generation = 0;
  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`/api/users${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let result: any = {};
    if (text)
      try {
        result = JSON.parse(text);
      } catch {}
    if (!response.ok) {
      const messages: Record<string, string> = {
        INVALID_GITHUB_URL: 'Use a https://github.com/username profile link.',
        INVALID_LINKEDIN_URL: 'Use a https://linkedin.com/in/username profile link.',
        EMAIL_IN_USE: 'This email address is already used by another account.',
        ACCOUNT_DELETED: 'Deleted accounts cannot be changed.',
        LAST_ADMINISTRATOR: 'The final active administrator must retain access.'
      };
      throw new Error(messages[result.code] ?? result.code ?? result.message);
    }
    return result;
  }
  async function load(id: string | undefined, query: string) {
    const current = ++generation;
    loading = true;
    error = '';
    notice = '';
    member = null;
    records = [];
    total = 0;
    confirmDelete = false;
    try {
      const result = await api(id ? `/${encodeURIComponent(id)}` : `?${query}`);
      if (current !== generation) return;
      if (id) {
        member = result;
        emailDraft = result.email;
        resetConfirmation = false;
        accessRole = result.role;
        accessStatus = result.membershipStatus;
        accessFlags = [...result.flags];
      } else {
        records = result.users;
        total = result.total;
        member = null;
      }
    } catch (e) {
      if (current === generation) error = e instanceof Error ? e.message : 'Error';
    } finally {
      if (current === generation) loading = false;
    }
  }
  $effect(() => {
    const query = page.url.searchParams.toString();
    search = page.url.searchParams.get('search') ?? '';
    void load(memberId, query);
  });
  function filter(key: string, value: string) {
    const url = new URL(page.url);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    url.searchParams.delete('page');
    void goto(url.pathname + url.search);
  }
  async function mutate(path: string, method: string, body?: unknown) {
    busy = true;
    error = '';
    notice = '';
    try {
      const result = await api(path, method, body);
      if (method === 'DELETE') await goto('/members');
      else {
        const updated = result.user ?? result;
        if (path.endsWith('/access') && member) {
          // Saving access must not discard unsaved profile edits.
          member = {
            ...member,
            role: updated.role,
            membershipStatus: updated.membershipStatus,
            flags: updated.flags
          };
          accessRole = updated.role;
          accessStatus = updated.membershipStatus;
          accessFlags = [...updated.flags];
        } else if (path.endsWith('/email') && member) {
          member = { ...member, email: updated.email };
          emailDraft = updated.email;
        } else member = updated;
        notice = path.endsWith('/email')
          ? 'Email updated. Sessions revoked and verification email queued.'
          : 'Changes saved.';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Error';
    } finally {
      busy = false;
    }
  }
</script>

{#if notice}<p role="status">{notice}</p>{/if}
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if loading}<Skeleton label={'Loading members'} />{:else if member}
  <a class="btn btn-outline" href="/members"
    ><ArrowLeft size={15} aria-hidden="true" />{'All members'}</a
  >
  <div class="member-layout">
    <section class="card">
      <h1>{member.firstName || member.name} {member.lastName}</h1>
      <p class="muted">{member.email}</p>
      {#if member.image}<img class="member-avatar" src={member.image} alt="" />{/if}
      {#if administrator && member.membershipStatus !== 'deleted'}
        <form
          id="member-profile"
          class="profile-fields"
          onsubmit={(event) => {
            event.preventDefault();
            void mutate(`/${member!.id}/profile`, 'PATCH', {
              firstName: member!.firstName,
              lastName: member!.lastName,
              nickname: member!.nickname ?? '',
              bio: member!.bio ?? '',
              github: member!.github || null,
              linkedin: member!.linkedin || null
            });
          }}
        >
          <label
            >{'First name'}<input bind:value={member.firstName} required maxlength="100" /></label
          >
          <label>{'Last name'}<input bind:value={member.lastName} maxlength="100" /></label>
          <label>{'Nickname'}<input bind:value={member.nickname} maxlength="100" /></label>
          <label class="wide"
            >Bio<textarea bind:value={member.bio} rows="5" maxlength="5000"></textarea></label
          >
          <label
            >GitHub<input
              type="url"
              bind:value={member.github}
              placeholder="https://github.com/username"
            /></label
          >
          <label
            >LinkedIn<input
              type="url"
              bind:value={member.linkedin}
              placeholder="https://linkedin.com/in/username"
            /></label
          >
        </form>
      {:else}<p>{member.bio}</p>{/if}
    </section>
    <form
      id="member-access"
      class="card access"
      onsubmit={(event) => {
        event.preventDefault();
        if (!canSaveAccess) return;
        void mutate(
          `/${member!.id}/access`,
          'PATCH',
          administrator
            ? { role: accessRole, membershipStatus: accessStatus, flags: accessFlags }
            : { membershipStatus: accessStatus }
        );
      }}
    >
      <h2>{'Access'}</h2>
      <label for="member-status">{'Account status'}</label>
      <Dropdown
        id="member-status"
        label={'Account status'}
        value={accessStatus}
        options={statuses.filter(
          (s) =>
            s.value !== 'deleted' &&
            (administrator || s.value === 'active' || s.value === 'pending')
        )}
        disabled={busy || !canSaveAccess}
        onselect={(value) => (accessStatus = value as Profile['membershipStatus'])}
      />
      <label for="member-role">{'Role'}</label>
      <Dropdown
        id="member-role"
        label={'Role'}
        value={accessRole}
        options={roles}
        disabled={busy || !administrator || member.membershipStatus === 'deleted'}
        onselect={(value) => (accessRole = value as Profile['role'])}
      />
      <p class="muted access-help">{'Access changes take effect when you save them.'}</p>
      {#if administrator && member.membershipStatus !== 'deleted'}<PermissionFlags
          bind:flags={accessFlags}
          {language}
          disabled={busy}
        />{/if}
    </form>
  </div>
  {#if member.membershipStatus === 'active'}<a
      class="btn btn-outline"
      href={`${websiteOrigin}/members/${encodeURIComponent(member.id)}`}
      ><ArrowUpRight size={15} />{'View public profile'}</a
    >{/if}
  {#if administrator && member.membershipStatus !== 'deleted'}
    <ContentTranslations
      kind="profile"
      id={member.id}
      translations={member.translations}
      baseline={{
        firstName: member.firstName,
        lastName: member.lastName,
        nickname: member.nickname,
        bio: member.bio
      }}
      {language}
      onsaved={(result) => {
        if (member) member.translations = result.translations;
      }}
    />
  {/if}
  {#if administrator && member.membershipStatus !== 'deleted'}
    <section class="card account-authentication">
      <h2>{'Authentication'}</h2>
      <form
        id="member-email"
        onsubmit={(event) => {
          event.preventDefault();
          void mutate(`/${member!.id}/email`, 'PATCH', { email: emailDraft.trim() });
        }}
      >
        <label
          >{'Email address'}<input
            type="email"
            bind:value={emailDraft}
            required
            maxlength="254"
          /></label
        >
        <p class="muted">
          {'Changing the email revokes sessions and sends a verification link to the new address.'}
        </p>
      </form>
      <p class="muted">
        {'Send a recovery link to the saved email address. Passwords are never displayed here.'}
      </p>
      {#if resetConfirmation}
        <p>{'Send a password recovery email to this member?'}</p>
        <div class="row">
          <button class="btn" disabled={busy} onclick={resetPassword}>{'Send recovery link'}</button
          ><button
            class="btn btn-outline"
            disabled={busy}
            onclick={() => (resetConfirmation = false)}>{'Cancel'}</button
          >
        </div>
      {:else}
        <button class="btn btn-outline" disabled={busy} onclick={() => (resetConfirmation = true)}
          >{'Reset password'}</button
        >
      {/if}
    </section>
  {/if}
  {#if member.membershipStatus !== 'deleted'}
    <div class="member-actions">
      {#if administrator}<button class="btn" form="member-profile" disabled={busy}
          ><Save size={15} aria-hidden="true" />{'Save profile'}</button
        >{/if}
      {#if administrator}<button
          class="btn btn-outline"
          form="member-email"
          disabled={busy || emailDraft.trim().toLowerCase() === member.email.toLowerCase()}
          ><Save size={15} aria-hidden="true" />{'Save email'}</button
        >{/if}
      {#if canSaveAccess}<button class="btn btn-outline" form="member-access" disabled={busy}
          ><Save size={15} aria-hidden="true" />{'Save access'}</button
        >{/if}
    </div>
    {#if administrator}<section class="card account-danger">
        <details>
          <summary><Trash2 size={15} aria-hidden="true" />{'Delete account'}</summary>
          <p>{'Personal data will be anonymized. Association content will remain.'}</p>
          {#if confirmDelete}<div role="alert">
              <p>{'Delete account? Personal data will be anonymized. Content will remain.'}</p>
              <div class="row">
                <button
                  type="button"
                  class="btn danger-button"
                  disabled={busy}
                  onclick={() => mutate(`/${member!.id}`, 'DELETE')}>{'Confirm deletion'}</button
                >
                <button
                  type="button"
                  class="btn btn-outline"
                  disabled={busy}
                  onclick={() => (confirmDelete = false)}>{'Cancel'}</button
                >
              </div>
            </div>{:else}<button
              type="button"
              class="btn btn-outline danger-button"
              disabled={busy}
              onclick={() => (confirmDelete = true)}>{'Delete account'}</button
            >{/if}
        </details>
      </section>{/if}
  {/if}
{:else if memberId}
  <a class="btn btn-outline" href="/members">{'All members'}</a>
{:else}
  <form
    class="member-filters"
    onsubmit={(event) => {
      event.preventDefault();
      filter('search', search);
    }}
  >
    <div class="search">
      <label for="member-search" class="sr-only">{'Search members'}</label><Search
        size={16}
        aria-hidden="true"
      /><input
        id="member-search"
        bind:value={search}
        placeholder={'Name, nickname or email…'}
      /><button class="btn btn-outline">{'Search'}</button>
    </div>
    <Dropdown
      label={'Filter status'}
      value={page.url.searchParams.get('status') ?? ''}
      options={[{ value: '', label: 'All statuses' }, ...statuses]}
      onselect={(v) => filter('status', v)}
    />
    <Dropdown
      label={'Filter role'}
      value={page.url.searchParams.get('role') ?? ''}
      options={[{ value: '', label: 'All roles' }, ...roles]}
      onselect={(v) => filter('role', v)}
    />
  </form>
  <section class="member-directory" aria-label="Member directory">
    <div class="table-wrap">
      <table>
        <thead><tr><th>{'Person'}</th><th>Email</th><th>Status</th><th>{'Role'}</th></tr></thead
        ><tbody
          >{#each records as record}<tr
              ><td
                ><MemberPreview
                  member={record}
                  href={`/members/${encodeURIComponent(record.id)}`}
                  role={roles.find((role) => role.value === record.role)?.label ?? record.role}
                /></td
              ><td>{record.email}</td><td
                >{statuses.find((s) => s.value === record.membershipStatus)?.label}</td
              ><td>{roles.find((r) => r.value === record.role)?.label}</td></tr
            >{/each}</tbody
        >
      </table>
    </div>
    {#if !records.length}<p>{'No matching members.'}</p>{/if}
    <footer class="directory-footer">
      <p class="muted">
        {firstResult}
        to
        {lastResult} / {total} <span>members</span>
      </p>
      <nav class="pagination" aria-label="Member table pagination">
        <button
          type="button"
          class="btn btn-outline page-button"
          disabled={currentPage === 0 || loading}
          onclick={() => paginate(-1)}
          aria-label="Previous page"
          ><ChevronLeft size={16} aria-hidden="true" /><span>{'Previous'}</span></button
        >
        <span class="page-number">{currentPage + 1} / {Math.max(1, Math.ceil(total / 50))}</span>
        <button
          type="button"
          class="btn btn-outline page-button"
          disabled={(currentPage + 1) * 50 >= total || loading}
          onclick={() => paginate(1)}
          aria-label="Next page"
          ><span>{'Next'}</span><ChevronRight size={16} aria-hidden="true" /></button
        >
      </nav>
    </footer>
  </section>
{/if}

<style>
  .account-authentication {
    margin-top: 20px;
  }
  .account-authentication form {
    max-width: 560px;
    margin-top: 16px;
  }
  .account-authentication p {
    margin: 12px 0;
  }
  .member-directory {
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--surface);
  }
  .member-directory :global(td) {
    vertical-align: middle;
  }
  .directory-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 20px;
    border-top: 1px solid var(--line);
  }
  .directory-footer p {
    margin: 0;
    font-size: 12px;
  }
  .pagination {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .page-number {
    min-width: 44px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }
  .page-button {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 12px;
    gap: 6px;
  }
  @media (max-width: 540px) {
    .directory-footer {
      padding: 14px 12px;
      gap: 8px;
    }
    .page-button span {
      display: none;
    }
    .pagination {
      gap: 8px;
    }
    .directory-footer p span {
      display: none;
    }
  }
  .member-layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    gap: 24px;
    margin-top: 24px;
  }
  .profile-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 24px;
  }
  .profile-fields label {
    display: grid;
    gap: 8px;
  }
  .profile-fields input,
  .profile-fields textarea {
    margin: 0;
  }
  .wide {
    grid-column: 1/-1;
  }
  .access {
    display: grid;
    gap: 14px;
    align-content: start;
    min-width: 0;
  }
  .member-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
    margin: 24px 0;
    padding: 18px;
    border: 1px solid var(--line);
    background: var(--surface);
    position: sticky;
    bottom: 12px;
    z-index: 10;
  }
  .account-danger summary {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  .account-danger p {
    margin: 18px 0;
  }
  .access-help {
    font-size: 12px;
    margin: 0;
  }
  .member-avatar {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
  }
  .member-filters {
    display: grid;
    grid-template-columns: minmax(250px, 2fr) 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .search input {
    margin: 0;
    min-width: 0;
  }
  .search button {
    flex-shrink: 0;
  }
  a {
    color: var(--ink);
  }
  @media (max-width: 900px) {
    .member-layout,
    .member-filters {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 540px) {
    .profile-fields {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    .member-actions {
      position: static;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 12px;
      gap: 8px;
    }
    .member-actions > :first-child {
      grid-column: 1 / -1;
    }
    .member-actions button {
      min-width: 0;
      padding: 10px 8px;
      font-size: 12px;
    }
  }
</style>
