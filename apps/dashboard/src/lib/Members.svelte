<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import Skeleton from './Skeleton.svelte';
  import ContentTranslations from './ContentTranslations.svelte';
  import SettingsNav from './SettingsNav.svelte';
  import { ArrowUpRight, KeyRound, Shield, UserRound } from '@lucide/svelte';
  import {
    Avatar,
    Banner,
    Button,
    Card,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Selector,
    Section,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    Text,
    TextArea,
    TextInput,
    VStack
  } from '@astryx-sv/core';
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
    const limit = key === 'bio' ? 5000 : 100;
    const next = value.slice(0, limit);
    if (contentLocale !== primaryContentLocale) translationDraft[key] = next;
    else if (member) member[key] = next;
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

{#if notice}<Banner status="success" title={notice} role="status" />{/if}
{#if error}<Banner status="error" title={error} role="alert" />{/if}
{#if loading}
  <Skeleton label="Ładowanie członków" />
{:else if member}
  {@const editable = member.membershipStatus !== 'deleted'}
  <HStack>
    <Button variant="secondary" label="Wszyscy członkowie" href="/members">
      {#snippet icon()}<ArrowLeft size={15} aria-hidden="true" />{/snippet}
    </Button>
  </HStack>
  <HStack gap={4} vAlign="start" justify="between" wrap="wrap">
    <HStack gap={3} vAlign="center">
      {#if member.image}
        <Avatar
          src={member.image}
          name={member.firstName || member.name}
          size={96}
          shape="rounded"
        />
      {/if}
      <VStack gap={1}>
        <Heading level={1}>{member.firstName || member.name} {member.lastName}</Heading>
        <Text color="secondary">{member.email}</Text>
      </VStack>
    </HStack>
    {#if member.membershipStatus === 'active'}
      <Button
        variant="secondary"
        label="Zobacz publiczny profil"
        href={`${websiteOrigin}/members/${encodeURIComponent(member.id)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {#snippet icon()}<ArrowUpRight size={15} aria-hidden="true" />{/snippet}
      </Button>
    {/if}
  </HStack>

  <VStack gap={6} class="settings-layout">
    <SettingsNav
      label="Sekcje członka"
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

    <VStack gap={6} class="settings-main">
      <Section id="profile" aria-labelledby="profile-heading">
        <VStack gap={4}>
          <Heading level={2} id="profile-heading">Profil</Heading>
          {#if administrator && editable}
            <form
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
              <Card>
                <VStack gap={4}>
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
                  <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
                    <TextInput
                      id="m-first"
                      label="Imię"
                      value={localizedMember('firstName')}
                      onChange={(value) => setLocalizedMember('firstName', value)}
                      isRequired={contentLocale === primaryContentLocale}
                    />
                    <TextInput
                      id="m-last"
                      label="Nazwisko"
                      value={localizedMember('lastName')}
                      onChange={(value) => setLocalizedMember('lastName', value)}
                    />
                    <TextInput
                      id="m-nick"
                      label="Pseudonim"
                      value={localizedMember('nickname')}
                      onChange={(value) => setLocalizedMember('nickname', value)}
                    />
                    <TextArea
                      id="m-bio"
                      label="Bio"
                      rows={5}
                      value={localizedMember('bio')}
                      onChange={(value) => setLocalizedMember('bio', value)}
                    />
                    {#if contentLocale === primaryContentLocale}
                      <TextInput
                        id="m-gh"
                        label="GitHub"
                        value={member.github ?? ''}
                        onChange={(value) => (member!.github = value || null)}
                        placeholder="https://github.com/username"
                      />
                      <TextInput
                        id="m-li"
                        label="LinkedIn"
                        value={member.linkedin ?? ''}
                        onChange={(value) => (member!.linkedin = value || null)}
                        placeholder="https://linkedin.com/in/username"
                      />
                    {/if}
                  </Grid>
                  {#if contentLocale === primaryContentLocale}
                    <HStack gap={2} justify="end">
                      <Button type="submit" label="Zapisz profil" isDisabled={busy}>
                        {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                      </Button>
                    </HStack>
                  {/if}
                </VStack>
              </Card>
            </form>
          {:else}
            <Card>
              <Text>{member.bio}</Text>
            </Card>
          {/if}
        </VStack>
      </Section>

      <Section id="access" aria-labelledby="access-heading">
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={2} id="access-heading">Dostęp</Heading>
            <Text type="supporting" color="secondary">
              Zmiany dostępu zaczną obowiązywać po zapisaniu.
            </Text>
          </VStack>
          <form
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
            <Card>
              <VStack gap={4}>
                <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
                  <Selector
                    label="Status konta"
                    value={accessStatus}
                    options={statuses.filter(
                      (s) =>
                        s.value !== 'deleted' &&
                        (administrator || s.value === 'active' || s.value === 'pending')
                    )}
                    isDisabled={busy || !canSaveAccess}
                    onChange={(value: string) =>
                      (accessStatus = value as Profile['membershipStatus'])}
                  />
                  <Selector
                    label="Rola"
                    value={accessRole}
                    options={roles}
                    isDisabled={busy || !administrator || !editable}
                    onChange={(value: string) => (accessRole = value as Profile['role'])}
                  />
                </Grid>
                {#if administrator && editable}
                  <PermissionFlags bind:flags={accessFlags} disabled={busy} />
                {/if}
                {#if canSaveAccess}
                  <HStack gap={2} justify="end">
                    <Button type="submit" label="Zapisz dostęp" isDisabled={busy}>
                      {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                    </Button>
                  </HStack>
                {/if}
              </VStack>
            </Card>
          </form>
        </VStack>
      </Section>

      {#if administrator && editable}
        <Section id="authentication" aria-labelledby="auth-heading">
          <VStack gap={4}>
            <Heading level={2} id="auth-heading">Uwierzytelnianie</Heading>
            <form
              onsubmit={(event) => {
                event.preventDefault();
                void mutate(`/${member!.id}/email`, 'PATCH', { email: emailDraft.trim() });
              }}
            >
              <Card>
                <VStack gap={4}>
                  <TextInput
                    id="m-email"
                    type="email"
                    label="Adres e-mail"
                    value={emailDraft}
                    onChange={(value) => (emailDraft = value.slice(0, 254))}
                    isRequired
                    description="Zmiana adresu e-mail unieważnia sesje i wysyła link weryfikacyjny na nowy adres."
                  />
                  <HStack gap={2} justify="end">
                    <Button
                      type="submit"
                      label="Zapisz e-mail"
                      isDisabled={busy ||
                        emailDraft.trim().toLowerCase() === member.email.toLowerCase()}
                    >
                      {#snippet icon()}<Save size={15} aria-hidden="true" />{/snippet}
                    </Button>
                  </HStack>
                </VStack>
              </Card>
            </form>
            <Card>
              <VStack gap={3}>
                <Text type="supporting" color="secondary">
                  Wyślij link do odzyskania hasła na zapisany adres e-mail. Hasła nie są tutaj
                  wyświetlane.
                </Text>
                {#if resetConfirmation}
                  <Text>Wysłać temu członkowi wiadomość do odzyskania hasła?</Text>
                  <HStack gap={2} wrap="wrap">
                    <Button
                      label="Wyślij link do odzyskania hasła"
                      isDisabled={busy}
                      onclick={resetPassword}
                    />
                    <Button
                      variant="secondary"
                      label="Anuluj"
                      isDisabled={busy}
                      onclick={() => (resetConfirmation = false)}
                    />
                  </HStack>
                {:else}
                  <HStack>
                    <Button
                      variant="secondary"
                      label="Resetuj hasło"
                      isDisabled={busy}
                      onclick={() => (resetConfirmation = true)}
                    />
                  </HStack>
                {/if}
              </VStack>
            </Card>
          </VStack>
        </Section>

        <Section id="danger" aria-labelledby="danger-heading">
          <VStack gap={4}>
            <Heading level={2} id="danger-heading">Usuń konto</Heading>
            <Card>
              <VStack gap={3}>
                <Text type="supporting" color="secondary">
                  Dane osobowe zostaną zanonimizowane. Treści koła pozostaną.
                </Text>
                {#if confirmDelete}
                  <VStack gap={3} role="alert">
                    <Text>Usunąć konto? Dane osobowe zostaną zanonimizowane. Treści pozostaną.</Text
                    >
                    <HStack gap={2} wrap="wrap">
                      <Button
                        type="button"
                        variant="destructive"
                        label="Potwierdź usunięcie"
                        isDisabled={busy}
                        onclick={() => mutate(`/${member!.id}`, 'DELETE')}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        label="Anuluj"
                        isDisabled={busy}
                        onclick={() => (confirmDelete = false)}
                      />
                    </HStack>
                  </VStack>
                {:else}
                  <HStack>
                    <Button
                      type="button"
                      variant="destructive"
                      label="Usuń konto"
                      isDisabled={busy}
                      onclick={() => (confirmDelete = true)}
                    />
                  </HStack>
                {/if}
              </VStack>
            </Card>
          </VStack>
        </Section>
      {/if}
    </VStack>
  </VStack>
{:else if memberId}
  <HStack>
    <Button variant="secondary" label="Wszyscy członkowie" href="/members" />
  </HStack>
{:else}
  <form
    class="member-filters"
    onsubmit={(event) => {
      event.preventDefault();
      filter('search', search);
    }}
  >
    <HStack gap={3} wrap="wrap" vAlign="end">
      <VStack gap={0} class="member-search">
        <TextInput
          id="member-search"
          label="Szukaj członków"
          isLabelHidden
          bind:value={search}
          placeholder="Imię, pseudonim lub email…"
        />
      </VStack>
      <Button type="submit" variant="secondary" label="Szukaj" />
      <Selector
        label="Filtr statusu"
        value={page.url.searchParams.get('status') ?? ''}
        options={[
          { value: '', label: 'Aktywni i zawieszeni' },
          ...statuses.map((status) => ({
            ...status,
            description:
              status.value === 'pending' && pendingCount > 0
                ? 'Członkostwa oczekujące na zatwierdzenie'
                : undefined
          }))
        ]}
        onChange={(value: string) => filter('status', value)}
      />
      <Selector
        label="Filtr roli"
        value={page.url.searchParams.get('role') ?? ''}
        options={[{ value: '', label: 'Wszystkie role' }, ...roles]}
        onChange={(value: string) => filter('role', value)}
      />
    </HStack>
  </form>
  <Section padding={0} aria-label="Lista członków">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Osoba</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Rola</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {#each records as record (record.id)}
          <TableRow>
            <TableCell>
              <MemberPreview
                member={record}
                href={`/members/${encodeURIComponent(record.id)}`}
                role={roles.find((role) => role.value === record.role)?.label ?? record.role}
              />
            </TableCell>
            <TableCell>{record.email}</TableCell>
            <TableCell>
              {statuses.find((s) => s.value === record.membershipStatus)?.label}
            </TableCell>
            <TableCell>{roles.find((r) => r.value === record.role)?.label}</TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
    {#if !records.length}
      <EmptyState title="Brak pasujących osób" description="Zmień wyszukiwanie lub filtry." />
    {/if}
    <HStack gap={4} vAlign="center" justify="between" padding={4} wrap="wrap">
      <Text type="supporting" color="secondary">
        {firstResult}–{lastResult} / {total} członków
      </Text>
      <HStack gap={2} vAlign="center" as="nav" aria-label="Strony listy członków">
        <Button
          variant="secondary"
          size="sm"
          label="Poprzednia strona"
          isDisabled={currentPage === 0 || loading}
          onclick={() => paginate(-1)}
        >
          {#snippet icon()}<ChevronLeft size={16} aria-hidden="true" />{/snippet}
        </Button>
        <Text type="supporting" color="secondary">
          {currentPage + 1} / {Math.max(1, Math.ceil(total / 50))}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          label="Następna strona"
          isDisabled={(currentPage + 1) * 50 >= total || loading}
          onclick={() => paginate(1)}
        >
          {#snippet endContent()}<ChevronRight size={16} aria-hidden="true" />{/snippet}
        </Button>
      </HStack>
    </HStack>
  </Section>
{/if}

<style>
  :global(.settings-layout) {
    display: grid !important;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: var(--spacing-8);
    align-items: start;
  }
  :global(.settings-main) {
    min-width: 0;
  }
  :global(.member-filters) {
    margin-bottom: var(--spacing-5);
  }
  :global(.member-search) {
    flex: 1 1 260px;
    min-width: 0;
  }
  @media (max-width: 900px) {
    :global(.settings-layout) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
</style>
