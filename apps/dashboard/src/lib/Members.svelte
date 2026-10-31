<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Dropdown from '@ksi-core/ui/platform/Dropdown.svelte';
  import Skeleton from './Skeleton.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import SettingsNav from './SettingsNav.svelte';
  import { ArrowUpRight, KeyRound, Shield, UserRound } from '@lucide/svelte';
  import PermissionFlags from './PermissionFlags.svelte';
  import MemberPreview from './MemberPreview.svelte';
  import { Search, ArrowLeft, Trash2, Save, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { Profile } from 'shared/types';
  import { primaryContentLocale, type ContentLocale } from 'shared/content-locales';
  let {
    administrator,
    memberId,
    websiteOrigin
  }: { administrator: boolean; memberId?: string; websiteOrigin: string } = $props();

  const roles = $derived([
    { value: 'member', label: 'Członek' },
    { value: 'board', label: 'Zarząd' },
    { value: 'administrator', label: 'Administrator' }
  ]);
  const statuses = $derived([
    { value: 'pending', label: 'Oczekujący' },
    { value: 'active', label: 'Aktywne' },
    { value: 'suspended', label: 'Zawieszony' },
    { value: 'deleted', label: 'Usunięty' }
  ]);
  let records = $state<Profile[]>([]),
    total = $state(0),
    pendingCount = $state(0),
    member = $state<Profile | null>(null),
    loading = $state(true),
    busy = $state(false),
    error = $state(''),
    notice = $state(''),
    confirmDelete = $state(false),
    search = $state('');
  let emailDraft = $state('');
  let resetConfirmation = $state(false);
  let contentLocale = $state<ContentLocale>(primaryContentLocale);
  let translationDraft = $state<Record<string, string>>({});
  type LocalizedMemberField = 'firstName' | 'lastName' | 'nickname' | 'bio';
  function localizedMember(key: LocalizedMemberField) {
    return contentLocale === primaryContentLocale
      ? (member?.[key] ?? '')
      : (translationDraft[key] ?? '');
  }
  function setLocalizedMember(key: LocalizedMemberField, value: string) {
    if (contentLocale !== primaryContentLocale) translationDraft[key] = value;
    else if (member) member[key] = value;
  }
  async function resetPassword() {
    if (!member) return;
    busy = true;
    error = '';
    notice = '';
    try {
      await api(`/${member.id}/password-reset`, 'POST');
      notice = 'Wiadomość z linkiem do odzyskania hasła została zakolejkowana.';
      resetConfirmation = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Błąd';
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
        INVALID_GITHUB_URL: 'Użyj linku profilu https://github.com/username.',
        INVALID_LINKEDIN_URL: 'Użyj linku profilu https://linkedin.com/in/username.',
        EMAIL_IN_USE: 'Ten adres e-mail jest już używany przez inne konto.',
        ACCOUNT_DELETED: 'Nie można zmieniać usuniętych kont.',
        LAST_ADMINISTRATOR: 'Ostatni aktywny administrator musi zachować dostęp.'
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
    contentLocale = primaryContentLocale;
    translationDraft = {};
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
        pendingCount = result.pendingCount;
        member = null;
      }
    } catch (e) {
      if (current === generation) error = e instanceof Error ? e.message : 'Błąd';
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
          ? 'Adres e-mail zmieniony. Sesje unieważniono i zakolejkowano wiadomość weryfikacyjną.'
          : 'Zmiany zapisane.';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Błąd';
    } finally {
      busy = false;
    }
  }
</script>

{#if notice}<p class="notice" role="status">{notice}</p>{/if}
{#if error}<p class="error" role="alert">{error}</p>{/if}
{#if loading}<Skeleton label={'Ładowanie członków'} />{:else if member}
  {@const editable = member.membershipStatus !== 'deleted'}
  <a class="btn btn-outline detail-back" href="/members"
    ><ArrowLeft size={15} aria-hidden="true" />Wszyscy członkowie</a
  >
  <div class="workspace-header">
    <div class="member-heading">
      {#if member.image}<img class="member-avatar" src={member.image} alt="" />{/if}
      <div>
        <h1>{member.firstName || member.name} {member.lastName}</h1>
        <p>{member.email}</p>
      </div>
    </div>
    {#if member.membershipStatus === 'active'}<a
        class="btn btn-outline"
        href={`${websiteOrigin}/members/${encodeURIComponent(member.id)}`}
        ><ArrowUpRight size={15} aria-hidden="true" />Zobacz publiczny profil</a
      >{/if}
  </div>

  <div class="settings-layout">
    <SettingsNav
      label={'Sekcje członka'}
      items={[
        { id: 'profile', label: 'Profil', icon: UserRound },
        { id: 'access', label: 'Dostęp', icon: Shield },
        ...(administrator && editable
          ? [
              { id: 'authentication', label: 'Uwierzytelnianie', icon: KeyRound },
              { id: 'danger', label: 'Usuń konto', icon: Trash2, danger: true }
            ]
          : [])
      ]}
    />

    <div class="settings-main">
      <section id="profile" class="settings-section" aria-labelledby="profile-heading">
        <header><h2 id="profile-heading">Profil</h2></header>
        {#if administrator && editable}
          <form
            class="card settings-card"
            onsubmit={(event) => {
              event.preventDefault();
              if (contentLocale !== primaryContentLocale) return;
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
              bind:selected={contentLocale}
              bind:draft={translationDraft}
              onsaved={(result) => {
                if (member) member.translations = result.translations;
              }}
            />
            <div class="field-grid">
              <div>
                <label for="m-first">Imię</label><input
                  id="m-first"
                  bind:value={
                    () => localizedMember('firstName'),
                    (value) => setLocalizedMember('firstName', value)
                  }
                  required={contentLocale === primaryContentLocale}
                  maxlength="100"
                />
              </div>
              <div>
                <label for="m-last">Nazwisko</label><input
                  id="m-last"
                  bind:value={
                    () => localizedMember('lastName'),
                    (value) => setLocalizedMember('lastName', value)
                  }
                  maxlength="100"
                />
              </div>
              <div class="field-wide">
                <label for="m-nick">Pseudonim</label><input
                  id="m-nick"
                  bind:value={
                    () => localizedMember('nickname'),
                    (value) => setLocalizedMember('nickname', value)
                  }
                  maxlength="100"
                />
              </div>
              <div class="field-wide">
                <label for="m-bio">Bio</label><textarea
                  id="m-bio"
                  bind:value={
                    () => localizedMember('bio'), (value) => setLocalizedMember('bio', value)
                  }
                  rows="5"
                  maxlength="5000"
                ></textarea>
              </div>
              {#if contentLocale === primaryContentLocale}<div>
                  <label for="m-gh">GitHub</label><input
                    id="m-gh"
                    type="url"
                    bind:value={member.github}
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <label for="m-li">LinkedIn</label><input
                    id="m-li"
                    type="url"
                    bind:value={member.linkedin}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>{/if}
            </div>
            {#if contentLocale === primaryContentLocale}<div class="card-footer">
                <button class="btn" disabled={busy}
                  ><Save size={15} aria-hidden="true" />Zapisz profil</button
                >
              </div>{/if}
          </form>
        {:else}
          <div class="card settings-card"><p>{member.bio}</p></div>
        {/if}
      </section>

      <section id="access" class="settings-section" aria-labelledby="access-heading">
        <header>
          <h2 id="access-heading">Dostęp</h2>
          <p>Zmiany dostępu zaczną obowiązywać po zapisaniu.</p>
        </header>
        <form
          class="card settings-card"
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
          <div class="field-grid">
            <div>
              <label for="member-status">Status konta</label>
              <Dropdown
                id="member-status"
                label={'Status konta'}
                value={accessStatus}
                options={statuses.filter(
                  (s) =>
                    s.value !== 'deleted' &&
                    (administrator || s.value === 'active' || s.value === 'pending')
                )}
                disabled={busy || !canSaveAccess}
                onselect={(value) => (accessStatus = value as Profile['membershipStatus'])}
              />
            </div>
            <div>
              <label for="member-role">Rola</label>
              <Dropdown
                id="member-role"
                label={'Rola'}
                value={accessRole}
                options={roles}
                disabled={busy || !administrator || !editable}
                onselect={(value) => (accessRole = value as Profile['role'])}
              />
            </div>
          </div>
          {#if administrator && editable}<PermissionFlags
              bind:flags={accessFlags}
              disabled={busy}
            />{/if}
          {#if canSaveAccess}
            <div class="card-footer">
              <button class="btn" disabled={busy}
                ><Save size={15} aria-hidden="true" />Zapisz dostęp</button
              >
            </div>
          {/if}
        </form>
      </section>

      {#if administrator && editable}
        <section id="authentication" class="settings-section" aria-labelledby="auth-heading">
          <header><h2 id="auth-heading">Uwierzytelnianie</h2></header>
          <form
            class="card settings-card"
            onsubmit={(event) => {
              event.preventDefault();
              void mutate(`/${member!.id}/email`, 'PATCH', { email: emailDraft.trim() });
            }}
          >
            <div>
              <label for="m-email">Adres e-mail</label><input
                id="m-email"
                type="email"
                bind:value={emailDraft}
                required
                maxlength="254"
              />
              <p class="field-help">
                Zmiana adresu e-mail unieważnia sesje i wysyła link weryfikacyjny na nowy adres.
              </p>
            </div>
            <div class="card-footer">
              <button
                class="btn"
                disabled={busy || emailDraft.trim().toLowerCase() === member.email.toLowerCase()}
                ><Save size={15} aria-hidden="true" />Zapisz e-mail</button
              >
            </div>
          </form>
          <div class="card settings-card">
            <p class="muted">
              Wyślij link do odzyskania hasła na zapisany adres e-mail. Hasła nie są tutaj
              wyświetlane.
            </p>
            {#if resetConfirmation}
              <p>Wysłać temu członkowi wiadomość do odzyskania hasła?</p>
              <div class="row">
                <button class="btn" disabled={busy} onclick={resetPassword}
                  >Wyślij link do odzyskania hasła</button
                ><button
                  class="btn btn-outline"
                  disabled={busy}
                  onclick={() => (resetConfirmation = false)}>Anuluj</button
                >
              </div>
            {:else}
              <div>
                <button
                  class="btn btn-outline"
                  disabled={busy}
                  onclick={() => (resetConfirmation = true)}>Resetuj hasło</button
                >
              </div>
            {/if}
          </div>
        </section>

        <section id="danger" class="settings-section" aria-labelledby="danger-heading">
          <header><h2 id="danger-heading">Usuń konto</h2></header>
          <div class="card settings-card danger">
            <p class="muted">Dane osobowe zostaną zanonimizowane. Treści koła pozostaną.</p>
            {#if confirmDelete}
              <div role="alert" class="settings-card">
                <p>Usunąć konto? Dane osobowe zostaną zanonimizowane. Treści pozostaną.</p>
                <div class="row">
                  <button
                    type="button"
                    class="btn danger-button"
                    disabled={busy}
                    onclick={() => mutate(`/${member!.id}`, 'DELETE')}>Potwierdź usunięcie</button
                  >
                  <button
                    type="button"
                    class="btn btn-outline"
                    disabled={busy}
                    onclick={() => (confirmDelete = false)}>Anuluj</button
                  >
                </div>
              </div>
            {:else}
              <div>
                <button
                  type="button"
                  class="btn btn-outline danger-button"
                  disabled={busy}
                  onclick={() => (confirmDelete = true)}>Usuń konto</button
                >
              </div>
            {/if}
          </div>
        </section>
      {/if}
    </div>
  </div>
{:else if memberId}
  <a class="btn btn-outline" href="/members">Wszyscy członkowie</a>
{:else}
  <form
    class="member-filters"
    onsubmit={(event) => {
      event.preventDefault();
      filter('search', search);
    }}
  >
    <div class="search">
      <label for="member-search" class="sr-only">Szukaj członków</label><Search
        size={16}
        aria-hidden="true"
      /><input
        id="member-search"
        bind:value={search}
        placeholder={'Imię, pseudonim lub email…'}
      /><button class="btn btn-outline">Szukaj</button>
    </div>
    <Dropdown
      label={'Filtr statusu'}
      value={page.url.searchParams.get('status') ?? ''}
      indicator={pendingCount > 0 ? 'Członkostwa oczekujące na zatwierdzenie' : undefined}
      options={[
        { value: '', label: 'Aktywni i zawieszeni' },
        ...statuses.map((status) => ({
          ...status,
          indicator:
            status.value === 'pending' && pendingCount > 0
              ? 'Członkostwa oczekujące na zatwierdzenie'
              : undefined
        }))
      ]}
      onselect={(v) => filter('status', v)}
    />
    <Dropdown
      label={'Filtr roli'}
      value={page.url.searchParams.get('role') ?? ''}
      options={[{ value: '', label: 'Wszystkie role' }, ...roles]}
      onselect={(v) => filter('role', v)}
    />
  </form>
  <section class="member-directory" aria-label="Lista członków">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Osoba</th><th>Email</th><th>Status</th><th>Rola</th></tr></thead><tbody
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
    {#if !records.length}<p>Brak pasujących osób.</p>{/if}
    <footer class="directory-footer">
      <p class="muted">
        {firstResult}–{lastResult} / {total} <span>członków</span>
      </p>
      <nav class="pagination" aria-label="Strony listy członków">
        <button
          type="button"
          class="btn btn-outline page-button"
          disabled={currentPage === 0 || loading}
          onclick={() => paginate(-1)}
          aria-label="Poprzednia strona"
          ><ChevronLeft size={16} aria-hidden="true" /><span>Poprzednia</span></button
        >
        <span class="page-number">{currentPage + 1} / {Math.max(1, Math.ceil(total / 50))}</span>
        <button
          type="button"
          class="btn btn-outline page-button"
          disabled={(currentPage + 1) * 50 >= total || loading}
          onclick={() => paginate(1)}
          aria-label="Następna strona"
          ><span>Następna</span><ChevronRight size={16} aria-hidden="true" /></button
        >
      </nav>
    </footer>
  </section>
{/if}

<style>
  .member-directory {
    border: 1px solid var(--line);
    border-radius: var(--radius-xl);
    background: var(--surface);
  }
  .member-directory table {
    width: max-content;
    min-width: 100%;
  }
  .member-directory th,
  .member-directory td {
    white-space: nowrap;
  }
  .member-directory :global(.identity-text) {
    overflow-wrap: normal;
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
    .member-filters {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
  }
</style>
